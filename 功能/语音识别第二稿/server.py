import os
import time
import base64
import requests
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='public', static_url_path='')

API_KEY = 'RMVuHw0CGLnPKOiHi28mcw0Q'
SECRET_KEY = 'avtzZytibnwlT4zcknaPCA9PywlaK7iy'
TOKEN_URL = 'https://openapi.baidu.com/oauth/2.0/token'
ASR_URL = 'http://vop.baidu.com/server_api'

cached_token = None
token_expire_time = 0


def get_access_token():
    global cached_token, token_expire_time
    if cached_token and time.time() < token_expire_time:
        return cached_token
    try:
        res = requests.get(TOKEN_URL, params={
            'grant_type': 'client_credentials',
            'client_id': API_KEY,
            'client_secret': SECRET_KEY
        })
        data = res.json()
        cached_token = data['access_token']
        token_expire_time = time.time() + data.get('expires_in', 2592000) - 600
        return cached_token
    except Exception as e:
        print(f'获取Token失败: {e}')
        raise


@app.route('/')
def index():
    return send_from_directory('public', 'index.html')


@app.route('/api/recognize', methods=['POST'])
def recognize():
    if 'audio' not in request.files:
        return jsonify({'error': '未收到音频文件'}), 400

    audio_file = request.files['audio']
    audio_data = audio_file.read()

    try:
        token = get_access_token()
        base64_audio = base64.b64encode(audio_data).decode('utf-8')

        payload = {
            'format': 'wav',
            'rate': 16000,
            'channel': 1,
            'cuid': 'english-practice-web',
            'token': token,
            'dev_pid': 1737,
            'speech': base64_audio,
            'len': len(audio_data)
        }

        res = requests.post(ASR_URL, json=payload, headers={'Content-Type': 'application/json'})
        return jsonify(res.json())
    except Exception as e:
        print(f'识别失败: {e}')
        return jsonify({'error': '语音识别失败', 'detail': str(e)}), 500


if __name__ == '__main__':
    print('服务器已启动: http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=False)
