import json
import requests
from datetime import datetime, timedelta

def main():
    # 昨日の日付を YYYY-MM-DD 形式で作成
    yesterday = datetime.utcnow() - timedelta(days=1)
    date_str = yesterday.strftime("%Y-%m-%d")

    # url = "http://<ECSのPublicIP>:3000/api/evaluate-with-articles"
    url = "http://13.115.63.249:3000/api/evaluate-with-articles"

    payload = {
        "date": date_str,
        "debugMode": False,
        "postToWordPress": True
    }

    try:
        # タイムアウトを10秒に設定
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "正常にレスポンスを取得しました",
                "data": data
            })
        }
    except requests.exceptions.Timeout:
        # 30秒で応答がなくてもOK扱いにする
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "10秒でレスポンスがなかったため処理を終了しました（OK扱い）"
            })
        }
    except requests.exceptions.RequestException as e:
        # その他のエラーは失敗扱い
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "リクエストエラーが発生しました",
                "error": str(e)
            })
        }


def lambda_handler(event, context):
    return main(event, context)