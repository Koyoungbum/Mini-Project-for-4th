// 위치 정보 가져오기
function getLocation() {
    console.log("getLocation 함수 실행됨");
    
    // 위치 정보 상태 표시
    const statusElement = document.createElement('div');
    statusElement.id = 'location-status';
    statusElement.style.padding = '10px';
    statusElement.style.margin = '10px';
    statusElement.style.backgroundColor = '#f8f9fa';
    statusElement.style.borderRadius = '5px';
    document.body.insertBefore(statusElement, document.body.firstChild);
    
    if (navigator.geolocation) {
        console.log("Geolocation API 사용 가능");
        statusElement.textContent = "위치 정보를 가져오는 중...";
        statusElement.style.color = "#666";
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        console.log("위치 정보 요청 시작...");
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("위치 정보 성공적으로 받음:", position);
                statusElement.textContent = "위치 정보를 성공적으로 받았습니다.";
                statusElement.style.color = "#28a745";
                showPosition(position);
            },
            (error) => {
                console.error("위치 정보 요청 실패:", error);
                // 위치 정보 접근이 거부된 경우 기본 위치(서울) 사용
                if (error.code === error.PERMISSION_DENIED) {
                    console.log("위치 정보 접근이 거부되어 기본 위치(서울)를 사용합니다.");
                    statusElement.textContent = "위치 정보 접근이 거부되어 기본 위치(서울)를 사용합니다.";
                    statusElement.style.color = "#ffc107";
                    
                    // 서울의 위도/경도
                    const defaultPosition = {
                        coords: {
                            latitude: 37.5665,
                            longitude: 126.9780
                        }
                    };
                    showPosition(defaultPosition);
                } else {
                    let errorMessage = '';
                    switch(error.code) {
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "위치 정보를 사용할 수 없습니다.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
                            break;
                        case error.UNKNOWN_ERROR:
                            errorMessage = "알 수 없는 오류가 발생했습니다.";
                            break;
                    }
                    statusElement.textContent = errorMessage;
                    statusElement.style.color = "#dc3545";
                    showError(error);
                }
            },
            options
        );
    } else {
        console.log("Geolocation API 사용 불가");
        statusElement.textContent = "이 브라우저에서는 위치 정보를 지원하지 않습니다.";
        statusElement.style.color = "#dc3545";
        alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
    }
}

// 위치 정보 표시
function showPosition(position) {
    try {
        console.log("showPosition 함수 실행됨");
        console.log("위치 정보 객체:", position);
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        console.log("위도:", lat, "경도:", lon);

        if (!lat || !lon) {
            throw new Error("위치 정보가 올바르지 않습니다.");
        }

        // 날씨 정보 가져오기
        const weatherUrl = new URL('http://localhost:5000/test-weather');
        weatherUrl.searchParams.append('lat', lat);
        weatherUrl.searchParams.append('lon', lon);
        
        console.log("날씨 정보 요청 URL:", weatherUrl.toString());

        // 로딩 상태 표시
        const statusElement = document.getElementById('location-status');
        if (statusElement) {
            statusElement.textContent = "날씨 정보를 가져오는 중...";
            statusElement.style.color = "#666";
        }

        fetch(weatherUrl)
            .then(response => {
                console.log("서버 응답 상태:", response.status);
                if (!response.ok) {
                    return response.json().then(err => {
                        console.error("서버 에러 응답:", err);
                        throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("받은 날씨 데이터:", data);
                
                if (!data || !data.weather) {
                    console.error("날씨 데이터 형식이 올바르지 않습니다:", data);
                    throw new Error("날씨 데이터 형식이 올바르지 않습니다.");
                }

                if (data.error) {
                    console.error("서버에서 반환한 에러:", data.error);
                    throw new Error(data.error);
                }

                // 성공 상태 표시
                if (statusElement) {
                    statusElement.textContent = "날씨 정보를 성공적으로 받았습니다.";
                    statusElement.style.color = "#28a745";
                }

                // 날씨 정보 표시
                document.getElementById('temperature').textContent = `${Math.round(data.weather.temp)}°C`;
                document.getElementById('weather-description').textContent = data.weather.description;
                document.getElementById('city-name').textContent = data.weather.city_name;
                document.getElementById('detailed-address').textContent = data.weather.detailed_address || "상세 주소를 찾을 수 없습니다.";

                // 현재 시간 계산 및 표시
                const now = new Date();
                const timeString = now.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: false 
                });
                const dateString = now.toLocaleDateString('ko-KR', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                });
                document.getElementById('local-time').textContent = `${dateString}, ${timeString}`;

                // 1초마다 시간 업데이트
                setInterval(() => {
                    const currentTime = new Date();
                    const currentTimeString = currentTime.toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    });
                    const currentDateString = currentTime.toLocaleDateString('ko-KR', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                    document.getElementById('local-time').textContent = `${currentDateString}, ${currentTimeString}`;
                }, 1000);

                // 날씨 아이콘 설정
                const weatherIcon = document.getElementById('weather-icon');
                if (weatherIcon) {
                    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather.icon}@2x.png`;
                    weatherIcon.alt = data.weather.description;
                }

                // 카카오맵 표시
                initializeMap(lat, lon);

                // 다음 버튼 활성화
                const nextBtn = document.getElementById('next-btn');
                if (nextBtn) {
                    nextBtn.disabled = false;
                }

                // 날씨 정보 저장
                localStorage.setItem('weatherData', JSON.stringify(data.weather));
            })
            .catch(error => {
                console.error('날씨 정보를 가져오는 중 오류 발생:', error);
                if (statusElement) {
                    statusElement.textContent = `날씨 정보를 가져오는 중 오류가 발생했습니다: ${error.message}`;
                    statusElement.style.color = "#dc3545";
                }
                alert(`날씨 정보를 가져오는 중 오류가 발생했습니다: ${error.message}`);
            });
    } catch (error) {
        console.error('위치 정보 처리 중 오류 발생:', error);
        if (statusElement) {
            statusElement.textContent = `위치 정보 처리 중 오류가 발생했습니다: ${error.message}`;
            statusElement.style.color = "#dc3545";
        }
        alert(`위치 정보 처리 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 카카오맵 초기화 함수
function initializeMap(lat, lon) {
    console.log("카카오맵 초기화 시작");
    console.log("위도:", lat, "경도:", lon);

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("지도 컨테이너를 찾을 수 없습니다.");
        return;
    }

    try {
        // 카카오맵 SDK가 로드되었는지 확인
        if (typeof kakao === 'undefined' || !kakao.maps) {
            console.error("카카오맵 SDK가 로드되지 않았습니다.");
            mapContainer.innerHTML = "지도를 불러올 수 없습니다. (SDK 로드 실패)";
            return;
        }

        // 지도 옵션 설정
        const mapOption = {
            center: new kakao.maps.LatLng(lat, lon), // 지도의 중심좌표
            level: 3 // 지도의 확대 레벨
        };

        // 지도 생성
        const map = new kakao.maps.Map(mapContainer, mapOption);
        console.log("카카오맵 생성 성공");

        // 마커 생성
        const markerPosition = new kakao.maps.LatLng(lat, lon);
        const marker = new kakao.maps.Marker({
            position: markerPosition
        });

        // 마커를 지도에 표시
        marker.setMap(map);
        console.log("마커 생성 및 표시 성공");

    } catch (error) {
        console.error("카카오맵 초기화 중 오류 발생:", error);
        mapContainer.innerHTML = `지도를 불러올 수 없습니다. (오류: ${error.message})`;
    }
}

// 위치 정보 오류 처리
function showError(error) {
    console.error('위치 정보 오류:', error);
    let errorMessage = '';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = "위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 정보 접근을 허용해주세요.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
        case error.TIMEOUT:
            errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
            break;
        case error.UNKNOWN_ERROR:
            errorMessage = "알 수 없는 오류가 발생했습니다.";
            break;
    }
    alert(errorMessage);
}

// 날씨 설명에 따른 아이콘 반환 함수는 더 이상 사용하지 않음
// function getWeatherIcon(description) { ... }

// 카카오맵 SDK 로드 완료 후 getLocation() 호출
// kakao.maps.load(function() {
//     console.log("카카오맵 SDK 로드 완료. getLocation() 호출.");
//     getLocation();
// }, {
//     libraries: ['services'] // 명시적으로 services 라이브러리 로드
// }); 