const ML_REQUEST_TIMEOUT_MS = 15000;

class MlServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "MlServiceError";
    this.statusCode = statusCode;
  }
}

const getPredictionUrl = () => {
  const serviceUrl = process.env.ML_SERVICE_URL;

  if (!serviceUrl) {
    throw new MlServiceError(
      "ML prediction service is not configured.",
      503,
    );
  }

  try {
    let normalizedUrl = serviceUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    return new URL("/predict", normalizedUrl).toString();
  } catch {
    throw new MlServiceError(
      "ML prediction service is not configured correctly.",
      503,
    );
  }
};

const requestFormPrediction = async (features) => {
  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(),
    ML_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(getPredictionUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(features),
      signal: abortController.signal,
    });

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      throw new MlServiceError(
        "ML prediction service returned an invalid response.",
        502,
      );
    }

    if (!response.ok) {
      console.error("ML SERVICE ERROR:", {
        status: response.status,
        response: responseBody,
      });

      throw new MlServiceError(
        "ML prediction service could not process this request.",
        502,
      );
    }

    if (
      responseBody.exercise !== features.exercise ||
      typeof responseBody.prediction !== "string" ||
      !responseBody.prediction.trim()
    ) {
      throw new MlServiceError(
        "ML prediction service returned an invalid response.",
        502,
      );
    }

    return responseBody.prediction;
  } catch (error) {
    if (error instanceof MlServiceError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new MlServiceError("ML prediction service timed out.", 504);
    }

    console.error("ML SERVICE CONNECTION ERROR:", error);
    throw new MlServiceError("ML prediction service is unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  MlServiceError,
  requestFormPrediction,
};
