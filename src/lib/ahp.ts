// AHP priority score calculator
export function calculatePriorityScore(
  urgency: number,
  gradeWeight: number,
  difficulty: number,
  weights: { urgency: number; grade: number; difficulty: number }
): number {
  // Normalize weights to sum to 1
  const total = weights.urgency + weights.grade + weights.difficulty;
  const wu = weights.urgency / total;
  const wg = weights.grade / total;
  const wd = weights.difficulty / total;

  // Score is weighted sum of normalized criteria (1-5 scale)
  const score = (urgency / 5) * wu + (gradeWeight / 5) * wg + (difficulty / 5) * wd;
  return Math.round(score * 100) / 100;
}
