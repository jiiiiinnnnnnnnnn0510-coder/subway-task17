const STUDENT = "2023720113_신미령";

exports.handler = async function (event) {
  const reply = (statusCode, data) => ({
    statusCode,

    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },

    body: JSON.stringify(
      { student: STUDENT, ...data },
      null,
      2
    )
  });

  if (event.httpMethod !== "GET") {
    return reply(405, {
      error: "GET 요청만 지원합니다."
    });
  }

  const date = event.queryStringParameters?.date || "";

  if (!/^\d{8}$/.test(date)) {
    return reply(400, {
      error: "날짜는 YYYYMMDD 형식이어야 합니다."
    });
  }

  // 20260230처럼 존재하지 않는 날짜도 검사한다.
  const parsed = new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`
  );

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10).replace(/-/g, "") !== date
  ) {
    return reply(400, {
      error: "실제로 존재하는 날짜를 입력하세요."
    });
  }

  const apiKey = process.env.SEOUL_API_KEY;

  if (!apiKey) {
    return reply(500, {
      error: "Netlify에서 SEOUL_API_KEY를 설정하세요."
    });
  }

  const apiUrl =
    "http://openapi.seoul.go.kr:8088/" +
    encodeURIComponent(apiKey) +
    "/json/CardSubwayStatsNew/1/1000/" +
    date;

  try {
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return reply(502, {
        error: "서울 API HTTP 오류: " + response.status
      });
    }

    const data = await response.json();

    return reply(200, data);
  } catch {
    return reply(502, {
      error:
        "서울 API 응답을 읽지 못했습니다. 잠시 후 다시 조회하세요."
    });
  }
};