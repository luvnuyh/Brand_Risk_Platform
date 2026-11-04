from googleapiclient.discovery import build
from concurrent.futures import ThreadPoolExecutor
import os
import time
import threading

# googleapiclient(httplib2)는 스레드 안전하지 않으므로 "스레드당 클라이언트 1개"를 재사용.
# (예전: 호출할 때마다 build() → 검색 페이지/영상마다 클라이언트를 새로 만들었음)
_local = threading.local()

SEARCH_WORKERS = 4
COMMENT_WORKERS = 8      # 예전 2 → 8. 429/quota 에러가 보이면 4로 낮추기


def get_youtube_client():
    client = getattr(_local, "client", None)
    if client is None:
        client = build(
            "youtube",
            "v3",
            developerKey=os.getenv("YOUTUBE_API_KEY"),
            cache_discovery=False,
        )
        _local.client = client
    return client


# ✅ 1. 영상 검색 (페이지네이션 포함)
#    ※ search.list 는 호출 1번당 quota 100 소모 (기본 일일 10,000) → 불필요한 검색을 줄이는 게 중요
def search_videos(query, max_results=50):
    youtube = get_youtube_client()

    videos = []
    next_page_token = None

    while len(videos) < max_results:
        request = youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=min(50, max_results - len(videos)),  # API 제한
            pageToken=next_page_token,
            order="relevance"
        )
        response = request.execute()

        for item in response.get("items", []):
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channel": item["snippet"]["channelTitle"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            })

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return videos


# ✅ 2. 댓글 수집 (페이지네이션 포함)
def get_video_comments(video_id, max_results=200):
    youtube = get_youtube_client()

    comments = []
    next_page_token = None

    while len(comments) < max_results:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=min(100, max_results - len(comments)),
            pageToken=next_page_token,
            textFormat="plainText"
        )
        response = request.execute()

        for item in response.get("items", []):
            snippet = item["snippet"]["topLevelComment"]["snippet"]

            comments.append({
                "text": snippet["textDisplay"],
                "like_count": snippet.get("likeCount", 0),
                "published_at": snippet.get("publishedAt")
            })

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return comments


def _safe_search(query, max_results):
    try:
        videos = search_videos(query, max_results=max_results)
    except Exception as e:
        print(f"[YOUTUBE ERROR] 검색 실패 '{query}': {e}")
        return []
    print(f"[YOUTUBE SEARCH] {query}", len(videos))
    return videos


# ✅ 3. 브랜드 + 인물 영상/댓글 수집
def collect_brand_and_person_comments(
    brand_name,
    person_names=None,
    max_videos=10,
    max_comments_per_video=200,
    include_brand=True,
):
    """
    브랜드 + 연관 인물 기준으로 영상 및 댓글 수집

    include_brand=False 이면 '{브랜드} {인물}' 쿼리만 검색한다.
    (인물 분석에서 브랜드 영상까지 매번 다시 수집·분석하던 낭비를 막기 위함)

    반환:
        total_videos
        total_comments
        comments (flatten)
        videos (영상별 상세)
    """
    t0 = time.perf_counter()
    person_names = person_names or []

    # 🔥 검색 쿼리 구성
    queries = [brand_name] if include_brand else []
    queries += [f"{brand_name} {person}" for person in person_names]

    # 🔥 영상 검색 (쿼리별 병렬, 결과는 쿼리 순서 유지)
    if len(queries) <= 1:
        search_results = [_safe_search(q, max_videos) for q in queries]
    else:
        with ThreadPoolExecutor(max_workers=min(SEARCH_WORKERS, len(queries))) as ex:
            search_results = list(ex.map(lambda q: _safe_search(q, max_videos), queries))

    # 🔥 중복 영상 제거 (처음 나온 순서 유지)
    unique_videos = {}
    for videos in search_results:
        for v in videos:
            unique_videos.setdefault(v["video_id"], v)
    unique_videos = list(unique_videos.values())
    t_search = time.perf_counter() - t0

    # 🔥 병렬 댓글 수집 (영상 순서대로 결과 취합)
    all_comments = []
    video_details = []

    if unique_videos:
        with ThreadPoolExecutor(max_workers=min(COMMENT_WORKERS, len(unique_videos))) as executor:
            futures = [
                (video, executor.submit(get_video_comments, video["video_id"], max_comments_per_video))
                for video in unique_videos
            ]

            for video, future in futures:
                try:
                    comments = future.result()
                except Exception as e:
                    # 댓글 비활성화 영상 등
                    print("[YOUTUBE ERROR]", video["title"], e)
                    continue

                all_comments.extend(c["text"] for c in comments)
                video_details.append({
                    "video_id": video["video_id"],
                    "title": video["title"],
                    "channel": video["channel"],
                    "url": video["url"],
                    "comments": comments,
                    "comment_count": len(comments),
                })

    print(
        "[YOUTUBE SUMMARY]",
        "videos =", len(video_details),
        "comments =", len(all_comments),
        f"| search={t_search:.1f}s total={time.perf_counter() - t0:.1f}s",
    )

    return {
        "total_videos": len(video_details),
        "total_comments": len(all_comments),
        "comments": all_comments,
        "videos": video_details,
    }