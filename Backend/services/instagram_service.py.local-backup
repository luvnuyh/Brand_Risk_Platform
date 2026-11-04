from apify_client import ApifyClient
import os
import json
import traceback

client = ApifyClient(
    os.getenv("APIFY_API_KEY")
)


def fetch_instagram_data(
    brand_name: str,
    limit: int = 500
):
    """
    Instagram Hashtag Scraper

    입력:
        스타벅스

    반환:
        [
            "캡션1",
            "캡션2",
            "댓글1",
            ...
        ]
    """

    texts = []

    run_input = {
        "hashtags": [
            brand_name.replace("#", "")
        ],
        "resultsLimit": limit,
    }

    try:

        print("=" * 100)
        print(f"[Instagram] 검색어: {brand_name}")
        print(f"[Instagram] run_input: {run_input}")
        print("=" * 100)

        run = client.actor(
            "apify/instagram-hashtag-scraper"
        ).call(
            run_input=run_input
        )

        dataset_id = run["defaultDatasetId"]

        print(
            f"[Instagram] dataset_id={dataset_id}"
        )

        items = list(
            client.dataset(
                dataset_id
            ).iterate_items()
        )

        print(
            f"[Instagram] 수집 게시물 수: {len(items)}"
        )

        if items:

            print("=" * 100)
            print("[Instagram] 첫 번째 결과")
            print(
                json.dumps(
                    items[0],
                    ensure_ascii=False,
                    indent=2
                )[:5000]
            )
            print("=" * 100)

        post_count = 0
        comment_count = 0

        for item in items:

            # ------------------
            # caption 추출
            # ------------------

            caption = None

            for field in [
                "caption",
                "text",
                "captionText",
                "description"
            ]:

                value = item.get(field)

                if isinstance(value, str):

                    value = value.strip()

                    if value:
                        caption = value
                        break

            if caption:

                texts.append(caption)
                post_count += 1

            # ------------------
            # 댓글 추출
            # ------------------

            latest_comments = (
                item.get("latestComments")
                or item.get("comments")
                or []
            )

            if isinstance(
                latest_comments,
                list
            ):

                for c in latest_comments:

                    if isinstance(c, dict):

                        text = (
                            c.get("text")
                            or c.get("comment")
                            or ""
                        ).strip()

                        if text:

                            texts.append(text)
                            comment_count += 1

                    elif isinstance(c, str):

                        c = c.strip()

                        if c:

                            texts.append(c)
                            comment_count += 1

        # ------------------
        # 중복 제거
        # ------------------

        texts = [
            t
            for t in dict.fromkeys(texts)
            if len(t.strip()) >= 3
        ]

        print(
            f"[Instagram] 게시글 수: {post_count}"
        )

        print(
            f"[Instagram] 댓글 수: {comment_count}"
        )

        print(
            f"[Instagram] 최종 텍스트 수: {len(texts)}"
        )

        return texts

    except Exception as e:

        print(
            f"[Instagram] 실패: {e}"
        )

        traceback.print_exc()

        return []