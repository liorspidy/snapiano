import { Text as RNText, TextProps } from 'react-native';
import { color } from '@/theme/tokens';
import classes from './Text.module.scss';

type Variant = 'display' | 'headline' | 'title' | 'bodyLarge' | 'body' | 'label' | 'caption';
type Props = TextProps & { variant?: Variant; tone?: keyof typeof color };

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: Props) {
  return <RNText {...rest} style={[classes[variant], classes[`tone-${tone}`], style]} />;
}
