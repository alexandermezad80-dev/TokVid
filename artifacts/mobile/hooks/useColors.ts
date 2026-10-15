import colors from '../constants/colors';
/** Android appearance must not replace the user-approved palette. */
export function useColors() {
  return {...colors.light, radius:colors.radius};
}
