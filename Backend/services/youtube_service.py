from googleapiclient.discovery import build
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

def get_youtube_client():
    api_key = os.getenv("YOUTUBE_API_KEY")

    return build(
        "youtube",
        "v3",
        developerKey=api_key
    )


# ✅ 1. 영상 검색 (페이지네이션 포함)
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
            order="relevance"  # 인기순 정렬
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


# ✅ 3. 브랜드 + 인물 영상/댓글 수집
def collect_brand_and_person_comments(
    brand_name,
    person_names=None,
    max_videos=10,
    max_comments_per_video=200
):
    """
    브랜드 + 연관 인물 기준으로 영상 및 댓글 수집

    반환:
        total_videos
        total_comments
        comments (flatten)
        videos (영상별 상세)
    """

    person_names = person_names or []

    # 🔥 검색 쿼리 구성
    queries = [brand_name]
    queries += [f"{brand_name} {person}" for person in person_names]

    # 🔥 영상 수집
    all_videos = []

    for query in queries:

        videos = search_videos(
            query,
            max_results=max_videos
        )

        print(
            f"[YOUTUBE SEARCH] {query}",
            len(videos)
        )

        all_videos.extend(videos)

    # 🔥 중복 영상 제거
    unique_videos = {v["video_id"]: v for v in all_videos}.values()

    all_comments = []
    video_details = []
    video_count = 0

    # 🔥 병렬 댓글 수집
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_to_video = {
            executor.submit(
                get_video_comments,
                video["video_id"],
                max_comments_per_video
            ): video
            for video in unique_videos
        }

        for future in as_completed(future_to_video):
            video = future_to_video[future]
            try:
                comments = future.result()

                all_comments.extend([c["text"] for c in comments])

                video_details.append({
                    "video_id": video["video_id"],
                    "title": video["title"],
                    "channel": video["channel"],
                    "url": video["url"],
                    "comments": comments,
                    "comment_count": len(comments),
                })

                video_count += 1

            except Exception as e:
                print(
                    "[YOUTUBE ERROR]",
                    video["title"],
                    e
                )

        print(
        "[YOUTUBE SUMMARY]",
        "videos =", video_count,
        "comments =", len(all_comments)
    )
    return {
        "total_videos": video_count,
        "total_comments": len(all_comments),
        "comments": all_comments,
        "videos": video_details,
    }