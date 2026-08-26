export type SpecialRequestStatus = 'open' | 'planned' | 'done';

export interface SpecialRequest {
  id: string;
  memberId: string;
  memberName: string;
  text: string;
  createdAt: string;
  status: SpecialRequestStatus;
  /** ISO date of the planned night that fulfilled this request */
  matchedMealDate?: string;
  matchedRecipeId?: string;
  /** ISO date the requester is hoping this lands on (e.g., game-day taco night) */
  preferredDate?: string;
}
