const getBtn = document.getElementById('get-recommendation-btn');
const resultArea = document.getElementById('result-area');
const loader = document.getElementById('loader');
const weatherInfo = document.getElementById('weather-info');
const recommendationsNav = document.getElementById('recommendations-nav');

const BACKEND_URL = 'http://127.0.0.1:5000/recommend';
let recommendations = [];
let currentSetIndex = 0;

getBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('위치 정보가 지원되지 않는 브라우저입니다.');
        return;
    }

    // 로딩 시작
    loader.style.display = 'block';
    getBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: latitude, lon: longitude }),
            });
            const data = await response.json();
            recommendations = data.recommendations;
            displayResults(data.weather);
        } catch (error) {
            alert('추천을 받아오는데 실패했습니다.');
            console.error('Error:', error);
        } finally {
            // 로딩 끝
            loader.style.display = 'none';
            getBtn.disabled = false;
        }
    }, (error) => {
        alert('위치 정보를 가져오는데 실패했습니다.');
        console.error('Error:', error);
        loader.style.display = 'none';
        getBtn.disabled = false;
    });
});

function displayResults(weather) {
    resultArea.style.display = 'block';
    
    // 날씨 정보 표시
    weatherInfo.innerHTML = `
        <h3>현재 날씨</h3>
        <p>${weather.description}</p>
        <p>기온: ${Math.round(weather.temp)}°C</p>
        <p>체감 온도: ${Math.round(weather.feels_like)}°C</p>
    `;

    // 첫 번째 추천 세트로 아바타 옷 입히기
    updateAvatar(recommendations[0]);
    
    // 추천 세트 네비게이션 버튼 만들기
    recommendationsNav.innerHTML = recommendations.map((_, index) => `
        <button class="nav-button ${index === 0 ? 'active' : ''}" 
                onclick="showRecommendation(${index})">
            세트 ${index + 1}
        </button>
    `).join('');
}

function updateAvatar(recommendationSet) {
    const { items } = recommendationSet;
    
    // 각 부위별 이미지 URL을 아바타 img 태그의 src에 설정
    document.getElementById('avatar-top').src = items.top?.image_url || '';
    document.getElementById('avatar-bottom').src = items.bottom?.image_url || '';
    document.getElementById('avatar-shoes').src = items.shoes?.image_url || '';
    document.getElementById('avatar-outer').src = items.outer?.image_url || '';
}

function showRecommendation(index) {
    currentSetIndex = index;
    updateAvatar(recommendations[index]);
    
    // 네비게이션 버튼 활성화 상태 업데이트
    document.querySelectorAll('.nav-button').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
} 