export const POINTS_PER_SUI = 1000 // 3$

// Profit is 15%
export const PROFIT_PERCENTAGE = 0.15

export const USD_PER_POINT = 1 / POINTS_PER_SUI

export function convertMistToPoints(mist: number): number {
  return (mist / 1_000_000_000) * POINTS_PER_SUI
}

export interface PromptingParams {
  inputTokens: number // tokens
  outputTokens: number // tokens
}

export interface PointsResponse {
  inputPoints: number
  outputPoints: number
  totalPoints: number
}

export interface PerKTokenPricing {
  usdPerInputToken: number
  usdPerOutputToken: number
}
// Single default pricing model (only one default model)
export const DEFAULT_PRICING: PerKTokenPricing = {
  usdPerInputToken: 0.000003,
  usdPerOutputToken: 0.000015
}

function calculatePointsForPricing(
  pricing: PerKTokenPricing,
  inputTokens: number,
  outputTokens: number
): PointsResponse {
  const inputCostUSD = pricing.usdPerInputToken * inputTokens
  const outputCostUSD = pricing.usdPerOutputToken * outputTokens
  const totalCostUSD = inputCostUSD + outputCostUSD

  return {
    inputPoints: (inputCostUSD / USD_PER_POINT) * PROFIT_PERCENTAGE,
    outputPoints: (outputCostUSD / USD_PER_POINT) * PROFIT_PERCENTAGE,
    totalPoints: (totalCostUSD / USD_PER_POINT) * PROFIT_PERCENTAGE
  }
}

export function calculatePoints(params: PromptingParams): PointsResponse {
  const { inputTokens, outputTokens } = params
  return calculatePointsForPricing(DEFAULT_PRICING, inputTokens, outputTokens)
}
