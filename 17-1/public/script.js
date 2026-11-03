document.addEventListener("DOMContentLoaded", function () {
  const subwayForm = document.getElementById("subwayForm");

  subwayForm.addEventListener("submit", function (event) {
    // 폼 제출 때문에 페이지가 새로고침되는 것을 막는다.
    event.preventDefault();

    // 예: 2024-08-03 → 20240803
    const date = document
      .getElementById("date")
      .value
      .replace(/-/g, "");

    const line = document.getElementById("line").value;

    getSubway(date, line);
  });
});

async function requestData(date) {
  // 같은 사이트에 배포된 Netlify Function을 호출한다.
  const url = "/.netlify/functions/subway?date=" + date;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "서버 요청에 실패했습니다.");
  }

  return data;
}

async function getSubway(date, line) {
  const status = document.getElementById("status");
  const button = document.getElementById("searchButton");
  const jsonLink = document.getElementById("jsonLink");

  document.getElementById("subway").replaceChildren();
  document.getElementById("summary").textContent = "";

  jsonLink.hidden = true;

  status.className = "";
  status.textContent = "조회 중입니다. 잠시 기다려 주세요.";
  button.disabled = true;

  try {
    const data = await requestData(date);

    const service = data.CardSubwayStatsNew;
    const result = service?.RESULT || data.RESULT;

    // 서울시 API는 HTTP 응답이 성공해도
    // JSON 내부에 인증 오류나 데이터 없음 메시지를 담을 수 있다.
    if (result?.CODE && result.CODE !== "INFO-000") {
      throw new Error(
        result.CODE + ": " + result.MESSAGE
      );
    }

    if (!service || !Array.isArray(service.row)) {
      throw new Error("조회 결과에 데이터 목록이 없습니다.");
    }

    const count = updateSubway(service.row, line);

    status.textContent =
      "조회 완료: " + date + " / " + line + " / " + count + "건";

    // 요청 범위가 전체 데이터보다 작은 경우를 알린다.
    if (Number(service.list_total_count) > service.row.length) {
      status.textContent +=
        " ※ 전체 데이터 중 처음 " +
        service.row.length +
        "건을 대상으로 조회했습니다.";
    }

    jsonLink.href =
      "/.netlify/functions/subway?date=" + date;

    jsonLink.hidden = false;
  } catch (error) {
    status.className = "error";
    status.textContent = "조회 실패: " + error.message;
  } finally {
    button.disabled = false;
  }
}

function updateSubway(rows, line) {
  const subwayDiv = document.getElementById("subway");
  const summary = document.getElementById("summary");

  // 전체를 선택하면 모든 행을,
  // 특정 호선을 선택하면 해당 호선의 행만 남긴다.
  const selectedRows = rows.filter(function (row) {
    return line === "전체" || row.SBWY_ROUT_LN_NM === line;
  });

  if (selectedRows.length === 0) {
    summary.textContent = "선택한 호선의 데이터가 없습니다.";
    return 0;
  }

  let totalOn = 0;
  let totalOff = 0;

  const fragment = document.createDocumentFragment();

  selectedRows.forEach(function (row) {
    const on = Number(row.GTON_TNOPE);
    const off = Number(row.GTOFF_TNOPE);

    const div = document.createElement("div");
    div.className = "dataItem";

    div.textContent =
      "날짜: " + row.USE_YMD +
      " | 호선: " + row.SBWY_ROUT_LN_NM +
      " | 역 이름: " + row.SBWY_STNS_NM +
      " | 탑승승객: " + on.toLocaleString("ko-KR") + "명" +
      " | 하차승객: " + off.toLocaleString("ko-KR") + "명";

    fragment.appendChild(div);

    totalOn += on;
    totalOff += off;
  });

  subwayDiv.appendChild(fragment);

  summary.textContent =
    "표시된 데이터 " + selectedRows.length + "건" +
    " | 승차 합계: " + totalOn.toLocaleString("ko-KR") + "명" +
    " | 하차 합계: " + totalOff.toLocaleString("ko-KR") + "명";

  return selectedRows.length;
}