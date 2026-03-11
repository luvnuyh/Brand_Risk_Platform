from googleapiclient.discovery import build
from concurrent.futures import ThreadPoolExecutor, as_completed
import os


# 🔥 유튜브 클라이언트 생성
def get_youtube_client():
    api_key = os.getenv("YOUTUBE_API_KEY")
    return build("youtube", "v3", developerKey=api_key)


# 🔥 브랜드명으로 영상 검색
def search_videos_by_brand(brand_name, max_results=100):
    youtube = get_youtube_client()

    request = youtube.search().list(
        q=brand_name,
        part="snippet",
        type="video",
        maxResults=max_results
    )

    response = request.execute()

    videos = []
    for item in response["items"]:
        videos.append({
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "channel": item["snippet"]["channelTitle"]
        })

    return videos


# 🔥 특정 영상 댓글 수집 (수정: 이미 텍스트만 리턴하니까 그대로 사용)
def get_video_comments(video_id, max_results=100):
    youtube = get_youtube_client()

    request = youtube.commentThreads().list(
        part="snippet",
        videoId=video_id,
        maxResults=max_results,
        textFormat="plainText"
    )

    response = request.execute()

    comments = []

    for item in response.get("items", []):
        comment_text = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
        comments.append(comment_text)

    return comments


# 🔥 브랜드 전체 댓글 병렬 수집
def collect_brand_comments(brand_name, max_videos=100, max_comments_per_video=100):

    videos = search_videos_by_brand(brand_name, max_results=max_videos)

    all_comments = []
    video_count = 0

    # 🔥 병렬 처리
    with ThreadPoolExecutor(max_workers=10) as executor:

        future_to_video = {
            executor.submit(
                get_video_comments,
                video["video_id"],
                max_comments_per_video
            ): video
            for video in videos
        }

        for future in as_completed(future_to_video):
            try:
                comments = future.result()
                all_comments.extend(comments)
                video_count += 1
            except:
                continue  # 댓글 막힌 영상 스킵

    return {
        "total_videos": video_count,
        "comments": all_comments
    }