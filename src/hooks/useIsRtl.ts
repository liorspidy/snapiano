import { useTranslation } from 'react-i18next';
import { isRTL, Lang } from '@/i18n';

// Reading direction of the current language. Needed inside RN <Modal>s, which are separate windows and do not inherit the root direction.
export const useIsRtl = () => isRTL(useTranslation().i18n.language as Lang);
