# 미니 프로젝트

이 프로젝트는 날씨 정보 조회와 학습 자료 관리 기능을 제공하는 웹 애플리케이션입니다.

## 주요 기능

- OpenWeather API를 활용한 날씨 정보 조회
- Kakao Maps API를 활용한 위치 기반 서비스
- 학습 자료 관리 시스템

## 기술 스택

### Frontend
- React
- TypeScript
- Material-UI
- Axios

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic

## 설치 및 실행 방법

### Backend 설정
1. Python 가상환경 생성 및 활성화
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. 필요한 패키지 설치
```bash
cd backend
pip install -r requirements.txt
```

3. 서버 실행
```bash
uvicorn main:app --reload
```

### Frontend 설정
1. 필요한 패키지 설치
```bash
cd frontend
npm install
```

2. 개발 서버 실행
```bash
npm start
```

## 환경 변수 설정

### Backend
`.env` 파일을 생성하고 다음 변수들을 설정하세요:
```
OPENWEATHER_API_KEY=your_api_key
KAKAO_API_KEY=your_api_key
```

### Frontend
`.env` 파일을 생성하고 다음 변수들을 설정하세요:
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_KAKAO_API_KEY=your_api_key
```

## 라이선스

MIT License 