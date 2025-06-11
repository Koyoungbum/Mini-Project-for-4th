let currentRecommendationIndex = 0;
let recommendations = [];

// 이미지 로딩 오류 처리 함수
function handleImageError(imgElement, category) {
    console.error(`${category} 이미지 로딩 실패`);
    imgElement.style.display = 'none';
}

// 페이지 로드 시 실행 (초기 추천 가져오기)
window.onload = function() {
    getAndShowRecommendation();
};

// "새로운 스타일 추천받기" 버튼 클릭 시 이벤트 리스너
document.getElementById('get-new-recommendation-btn').addEventListener('click', getAndShowRecommendation);

// 추천을 가져와서 표시하는 메인 함수
async function getAndShowRecommendation() {
    try {
        // 저장된 날씨 정보 가져오기
        const weatherData = JSON.parse(localStorage.getItem('weatherData'));
        if (!weatherData) {
            alert('날씨 정보를 찾을 수 없습니다. 날씨 페이지로 돌아갑니다.');
            location.href = 'weather.html';
            return;
        }

        // 현재 날씨 표시
        document.getElementById('current-weather').textContent = 
            `${weatherData.city_name} | ${Math.round(weatherData.temp)}°C | ${weatherData.description}`;

        const outfitListDiv = document.getElementById('recommended-outfits-list');
        outfitListDiv.innerHTML = '<div class="loading-spinner"></div><p>추천을 불러오는 중...</p>';

        // 현재 위치 정보 가져오기
        let position;
        try {
            position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );
            });
        } catch (geoError) {
            console.error('위치 정보를 가져오는데 실패했습니다:', geoError);
            // 위치 정보를 가져오지 못한 경우 날씨 데이터의 좌표 사용
            position = {
                coords: {
                    latitude: weatherData.lat,
                    longitude: weatherData.lon
                }
            };
        }

        // 위치 정보 확인
        if (!position || !position.coords) {
            throw new Error('위치 정보를 가져올 수 없습니다.');
        }

        const requestData = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
        };

        console.log('서버로 전송할 데이터:', requestData);
        console.log('전송할 JSON 문자열:', JSON.stringify(requestData));

        // 추천 정보 가져오기
        const response = await fetch('http://localhost:5000/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            body: JSON.stringify(requestData)
        });

        console.log('서버 응답 상태:', response.status);
        console.log('서버 응답 헤더:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('서버 응답 텍스트:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('JSON 파싱 오류:', e);
            throw new Error('서버 응답을 파싱할 수 없습니다.');
        }

        if (!response.ok) {
            throw new Error(data.error || '서버에서 오류가 발생했습니다.');
        }

        if (data.error) {
            throw new Error(data.error + (data.details ? `\n상세 정보: ${data.details}` : ''));
        }

        if (!data.recommendations || data.recommendations.length === 0) {
            throw new Error('추천된 스타일이 없습니다.');
        }

        // 단일 추천 세트만 표시 (첫 번째 추천)
        const currentRecommendation = data.recommendations[0];
        displayRecommendation(currentRecommendation);

    } catch (error) {
        console.error('추천 정보를 가져오는 중 오류 발생:', error);
        const outfitListDiv = document.getElementById('recommended-outfits-list');
        outfitListDiv.innerHTML = '<p class="error-message">스타일 추천을 가져오는 중 오류가 발생했습니다.</p>';
        alert(`스타일 추천을 가져오는 중 오류가 발생했습니다.\n\n${error.message}`);
    }
}

// 추천 세트를 화면에 표시하는 함수
function displayRecommendation(recommendation) {
    const outfitListDiv = document.getElementById('recommended-outfits-list');
    outfitListDiv.innerHTML = ''; // 이전 내용 지우기

    // 스타일 설명 표시
    const styleDescDiv = document.createElement('div');
    styleDescDiv.className = 'style-description';
    styleDescDiv.innerHTML = `<p>${recommendation.style_description}</p>`;
    outfitListDiv.appendChild(styleDescDiv);

    // 옷 아이템들 표시
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'outfit-items'; // CSS에서 가로 정렬 및 크기 조정 담당

    const itemOrder = ['outer', 'top', 'bottom', 'shoes']; // 표시 순서
    itemOrder.forEach(category => {
        const item = recommendation.items[category];
        if (item) {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'outfit-item';
            
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = item.name;
            img.onerror = () => { // 이미지 로딩 실패 시 처리
                console.error(`Failed to load image: ${item.image_url}`);
                img.src = './placeholder.png'; // 대체 이미지 설정 (필요시 대체 이미지를 Project/frontend에 넣어주세요)
            };

            const name = document.createElement('p');
            name.textContent = `${item.name}`; // 카테고리 정보는 CSS로 숨기거나 디자인에 맞게 조절

            itemContainer.appendChild(img);
            itemContainer.appendChild(name);
            itemsDiv.appendChild(itemContainer);
        }
    });
    outfitListDiv.appendChild(itemsDiv);
} 