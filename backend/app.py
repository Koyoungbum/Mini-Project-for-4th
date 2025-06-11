import os
import json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
import requests
from flask_cors import CORS
import time
from datetime import datetime

# 환경 변수 로드
load_dotenv()

# 환경 변수 값 가져오기
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
OWM_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
KAKAO_REST_API_KEY = os.environ.get("KAKAO_REST_API_KEY")

# 필수 환경 변수 확인
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL 또는 Key가 .env 파일에 설정되지 않았습니다.")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")
if not OWM_API_KEY:
    raise ValueError("OPENWEATHER_API_KEY가 .env 파일에 설정되지 않았습니다.")
if not KAKAO_REST_API_KEY:
    raise ValueError("KAKAO_REST_API_KEY가 .env 파일에 설정되지 않았습니다.")

# Flask 앱 초기화 및 CORS 설정
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})

# 서버 설정
app.config['JSON_AS_ASCII'] = False  # 한글 지원
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# 서비스 클라이언트 초기화
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Supabase 연결 성공")
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    print(f"Supabase 연결 오류: {str(e)}")
    raise

def get_address_from_coords(lat, lon):
    """카카오맵 API를 사용하여 좌표로부터 주소 정보를 가져옵니다."""
    try:
        url = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
        headers = {
            "Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"
        }
        params = {
            "x": lon,
            "y": lat
        }
        
        print(f"카카오맵 API 요청 URL: {url}")
        print(f"카카오맵 API 요청 파라미터: {params}")
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        print(f"카카오맵 API 응답: {data}")
        
        if data and data.get('documents') and len(data['documents']) > 0:
            address_info = data['documents'][0]
            
            # 도로명 주소가 있는 경우
            if address_info.get('road_address'):
                return address_info['road_address']['address_name']
            # 지번 주소가 있는 경우
            elif address_info.get('address'):
                return address_info['address']['address_name']
            # 둘 다 없는 경우
            else:
                return "주소 정보를 찾을 수 없습니다."
        else:
            print("카카오맵 API 응답에 주소 정보가 없습니다.")
            return "주소 정보를 찾을 수 없습니다."
            
    except requests.exceptions.RequestException as e:
        print(f"카카오맵 API 호출 오류: {str(e)}")
        return "주소 정보를 가져오는 중 오류가 발생했습니다."
    except Exception as e:
        print(f"주소 정보 처리 중 오류 발생: {str(e)}")
        return "주소 정보를 처리하는 중 오류가 발생했습니다."

def get_weather_info(lat, lon):
    """OpenWeather API를 사용하여 날씨 정보를 가져옵니다."""
    try:
        # OpenWeatherMap API 호출
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OWM_API_KEY}&units=metric&lang=kr"
        print(f"OpenWeatherMap API 요청 URL: {weather_url}")
        
        weather_res = requests.get(weather_url).json()
        print(f"OpenWeatherMap API 응답: {weather_res}")

        if weather_res.get("cod") != 200:
            error_msg = weather_res.get("message", "날씨 정보를 가져오는 데 실패했습니다.")
            print(f"OpenWeatherMap API 오류: {error_msg}")
            return None

        # 날씨 정보 추출
        weather_info = weather_res["weather"][0]
        main_info = weather_res["main"]

        # 카카오맵 API로 주소 정보 가져오기
        address = get_address_from_coords(lat, lon)

        current_weather = {
            "description": weather_info.get("description", "날씨 정보 없음"),
            "temp": main_info.get("temp", 0),
            "feels_like": main_info.get("feels_like", 0),
            "city_name": weather_res.get("name", "알 수 없음"),
            "timezone": weather_res.get("timezone", 0),
            "dt": weather_res.get("dt", 0),
            "icon": weather_info.get("icon", "01d"),
            "detailed_address": address
        }

        return current_weather
    except Exception as e:
        print(f"날씨 정보 조회 중 오류 발생: {str(e)}")
        return None

@app.route('/test-weather', methods=['GET'])
def test_weather():
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        print(f"test_weather: 받은 lat={lat}, lon={lon}")

        if not lat or not lon:
            return jsonify({
                "error": "위도(lat)와 경도(lon)가 필요합니다.",
                "received": {
                    "lat": lat,
                    "lon": lon
                }
            }), 400

        if not is_valid_coordinates(lat, lon):
            return jsonify({
                "error": "유효하지 않은 좌표입니다.",
                "received": {
                    "lat": lat,
                    "lon": lon
                }
            }), 400

        # 날씨 정보 가져오기
        weather_info = get_weather_info(lat, lon)
        
        if not weather_info:
            return jsonify({"error": "날씨 정보를 가져오는 중 문제가 발생했습니다."}), 500

        return jsonify({"weather": weather_info})

    except Exception as e:
        print(f"날씨 정보 조회 중 오류 발생: {str(e)}")
        return jsonify({"error": f"날씨 정보 조회 중 오류가 발생했습니다: {str(e)}"}), 500

def is_valid_coordinates(lat, lon):
    """위도와 경도의 유효성을 검사합니다."""
    try:
        lat = float(lat)
        lon = float(lon)
        return -90 <= lat <= 90 and -180 <= lon <= 180
    except (ValueError, TypeError):
        return False

# --- 메인 추천 로직 엔드포인트 ---
@app.route('/recommend', methods=['POST', 'OPTIONS'])
def recommend_outfit():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
        return response

    try:
        print("요청 헤더:", dict(request.headers))
        print("요청 메서드:", request.method)
        print("요청 데이터 타입:", request.content_type)
        print("요청 데이터:", request.get_data(as_text=True))

        # 1. 프론트엔드에서 GPS 좌표 받기
        if not request.is_json:
            print("Content-Type이 application/json이 아닙니다.")
            return jsonify({"error": "Content-Type이 application/json이어야 합니다."}), 400

        try:
            data = request.get_json(force=True)
        except Exception as e:
            print(f"JSON 파싱 오류: {str(e)}")
            return jsonify({"error": "잘못된 JSON 형식입니다."}), 400

        print(f"받은 데이터: {data}")  # 디버깅용

        if not data:
            print("요청 본문이 비어있습니다.")
            return jsonify({"error": "요청 본문에 JSON 데이터가 없습니다."}), 400

        lat = data.get('lat')
        lon = data.get('lon')
        print(f"recommend_outfit: 받은 lat={lat}, lon={lon}") # 디버깅용

        if lat is None or lon is None:
            print("위도 또는 경도가 없습니다.")
            return jsonify({"error": "위도(lat)와 경도(lon)가 필요합니다."}), 400

        # 좌표 유효성 검사
        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                print(f"유효하지 않은 좌표: lat={lat}, lon={lon}")
                return jsonify({"error": "유효하지 않은 좌표입니다."}), 400
        except (ValueError, TypeError) as e:
            print(f"좌표 변환 오류: {str(e)}")
            return jsonify({"error": "좌표는 숫자여야 합니다."}), 400

        # 2. 날씨 정보 조회 (OpenWeatherMap)
        # ----------------------------------------------------
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OWM_API_KEY}&units=metric&lang=kr"
        print(f"날씨 API 요청 URL: {weather_url}")  # 디버깅용
        
        weather_res = requests.get(weather_url).json()
        print(f"날씨 API 응답: {weather_res}")  # 디버깅용

        # API 응답 구조 확인 및 오류 처리 강화
        if weather_res.get("cod") != 200: # OpenWeatherMap 오류 코드
            error_msg = weather_res.get("message", "날씨 정보를 가져오는 데 실패했습니다.")
            print(f"OpenWeatherMap API 오류: {error_msg}")
            return jsonify({"error": "날씨 정보를 가져오는 중 문제가 발생했습니다.", "details": error_msg}), 500

        current_weather = {
            "description": weather_res["weather"][0]["description"],
            "temp": weather_res["main"]["temp"],
            "feels_like": weather_res["main"]["feels_like"],
            "city_name": weather_res.get("name", "알 수 없음"),
            "timezone": weather_res.get("timezone"), # 시간대 오프셋 (초)
            "dt": weather_res.get("dt") # 데이터 계산 시간 (UTC Unix 시간)
        }
        weather_str = json.dumps(current_weather, ensure_ascii=False)
        print(f"현재 날씨: {weather_str}") # 디버깅용

        # 상세 주소 추가
        detailed_address = get_address_from_coords(lat, lon)
        current_weather["detailed_address"] = detailed_address

        # 3. DB에서 옷 정보 조회 (Supabase)
        # ----------------------------------------------------
        try:
            print("Supabase 쿼리 시작...")
            # 기본 정보만 먼저 조회
            clothes_res = supabase.table('clothes').select("id, name, category, image_url").execute()
            print(f"Supabase 응답: {clothes_res}")  # 디버깅용
            
            if not hasattr(clothes_res, 'data'):
                raise Exception("Supabase 응답에 data 필드가 없습니다.")
                
            clothes_list = clothes_res.data
            if not clothes_list:
                print("Supabase에서 옷 정보를 찾을 수 없습니다.")
                return jsonify({"error": "데이터베이스에서 옷 정보를 가져올 수 없습니다."}), 500

            # 카테고리별로 옷 분류
            categorized_clothes = {
                'top': [],
                'bottom': [],
                'outer': [],
                'shoes': []
            }
            
            for item in clothes_list:
                category = item.get('category', '').lower()
                if category in categorized_clothes:
                    categorized_clothes[category].append(item)
            
            # 각 카테고리별 옷이 있는지 확인
            for category, items in categorized_clothes.items():
                if not items:
                    print(f"경고: {category} 카테고리의 옷이 없습니다.")
            
            clothes_str = json.dumps(clothes_list, ensure_ascii=False)
            print(f"필터링된 의상 리스트: {clothes_str}") # 디버깅용

        except Exception as e:
            error_msg = f"Supabase 조회 오류: {str(e)}"
            print(error_msg)
            return jsonify({"error": "데이터베이스 조회 중 오류가 발생했습니다.", "details": error_msg}), 500

        # 4. Gemini API에 보낼 프롬프트 구성
        # ----------------------------------------------------
        prompt = f"""
        당신은 패션 스타일리스트입니다. 아래의 날씨 정보와 보유 의상 리스트를 보고, 날씨에 가장 잘 어울리는 옷 3세트를 추천해주세요.
        각 세트는 'top', 'bottom', 'shoes' 카테고리로 구성되어야 합니다.
        날씨가 쌀쌀하다면 (체감 온도 10도 이하) 'outer'도 필수로 포함해주세요.
        결과는 반드시 옷의 'id', 'name', 'image_url'을 포함하는 JSON 형식으로만 응답해야 합니다. 각 세트에 대한 스타일 설명도 덧붙여주세요.
        제시된 의상 리스트 내에서만 선택해야 합니다.

        ### 현재 날씨:
        {weather_str}

        ### 보유 의상 리스트:
        {clothes_str}

        ### JSON 출력 형식 예시 (이 구조를 반드시 지켜주세요. 'items' 내에 'outer'는 필수가 아님):
        {{
          "recommendations": [
            {{
              "style_description": "화창한 날에 어울리는 캐주얼한 스타일입니다.",
              "items": {{
                "top": {{ "id": 1, "name": "흰색 반팔티", "image_url": "url..." }},
                "bottom": {{ "id": 5, "name": "청바지", "image_url": "url..." }},
                "shoes": {{ "id": 8, "name": "흰색 스니커즈", "image_url": "url..." }}
              }}
            }},
            {{
              "style_description": "쌀쌀한 날씨에 대비한 따뜻한 스타일입니다.",
              "items": {{
                "top": {{ "id": 2, "name": "긴팔 니트", "image_url": "url..." }},
                "bottom": {{ "id": 6, "name": "슬랙스", "image_url": "url..." }},
                "outer": {{ "id": 10, "name": "가디건", "image_url": "url..." }},
                "shoes": {{ "id": 9, "name": "운동화", "image_url": "url..." }}
              }}
            }}
          ]
        }}
        """

        # 5. Gemini API 호출
        # ----------------------------------------------------
        try:
            gemini_response = gemini_model.generate_content(prompt)
            gemini_text = gemini_response.text.strip("```json\n").strip("```")
            print(f"Gemini 원본 응답:\n{gemini_text}") # 디버깅용

            try:
                recommendation_json = json.loads(gemini_text)
                if 'recommendations' not in recommendation_json:
                    raise ValueError("Gemini 응답에 'recommendations' 키가 없습니다.")
            except json.JSONDecodeError as e:
                print(f"Gemini 응답 JSON 파싱 오류: {e}")
                print(f"Gemini raw text: {gemini_text}") # 디버깅을 위해 원본 텍스트 출력
                return jsonify({"error": "Gemini 응답을 처리하는 중 오류가 발생했습니다.", "details": f"JSON 파싱 실패: {e}"}), 500
            except ValueError as e:
                print(f"Gemini 응답 형식 오류: {e}")
                return jsonify({"error": "Gemini가 예상치 못한 형식으로 응답했습니다.", "details": str(e)}), 500

        except Exception as e:
            print(f"Gemini API 호출 오류: {str(e)}")
            return jsonify({"error": "Gemini API 호출 중 오류가 발생했습니다.", "details": str(e)}), 500

        # 6. 프론트엔드에 최종 결과 전송
        # ----------------------------------------------------
        final_response = {
            "weather": current_weather,
            "recommendations": recommendation_json['recommendations']
        }
        return jsonify(final_response)

    except Exception as e:
        # 광범위한 오류 처리 (운영 시에는 더 세분화해야 함)
        print(f"오류 발생: {e}")
        return jsonify({"error": "서버 내부 오류가 발생했습니다.", "details": str(e)}), 500

# 스터디 자료 관련 API 엔드포인트
@app.route('/api/study-materials', methods=['GET'])
def get_study_materials():
    try:
        # 모든 스터디 자료 조회
        response = supabase.table('study_materials').select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study-materials', methods=['POST'])
def create_study_material():
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['title', 'content', 'category']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} 필드가 필요합니다."}), 400

        # 현재 시간 추가
        data['created_at'] = datetime.now().isoformat()
        
        # Supabase에 데이터 저장
        response = supabase.table('study_materials').insert(data).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study-materials/<int:material_id>', methods=['PUT'])
def update_study_material(material_id):
    try:
        data = request.get_json()
        data['updated_at'] = datetime.now().isoformat()
        
        # Supabase에서 데이터 업데이트
        response = supabase.table('study_materials').update(data).eq('id', material_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study-materials/<int:material_id>', methods=['DELETE'])
def delete_study_material(material_id):
    try:
        # Supabase에서 데이터 삭제
        response = supabase.table('study_materials').delete().eq('id', material_id).execute()
        return jsonify({"message": "삭제되었습니다."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study-materials/search', methods=['GET'])
def search_study_materials():
    try:
        query = request.args.get('q', '')
        category = request.args.get('category', '')
        
        # 검색 조건 구성
        search_query = supabase.table('study_materials').select("*")
        
        if query:
            search_query = search_query.ilike('title', f'%{query}%')
        if category:
            search_query = search_query.eq('category', category)
            
        response = search_query.execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # 로컬 개발 환경용 설정
    # 호스트를 '0.0.0.0'으로 설정하면 외부(모바일 기기 등)에서 접근 가능
    # debug=True는 개발 중 코드 변경 시 자동 재시작 및 디버거 활성화
    app.run(debug=True, host='0.0.0.0', port=5000)