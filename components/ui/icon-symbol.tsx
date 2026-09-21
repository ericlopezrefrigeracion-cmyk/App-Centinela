// Íconos con MaterialIcons -- ya no hay build nativo de iOS (app 100% web), así que no hace
// falta el mapeo a SF Symbols ni la dependencia expo-symbols que eso requería.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

// Nombres históricos "estilo SF Symbols" (se mantienen para no tocar los call sites) mapeados
// directamente al nombre real de Material Icons.
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'thermometer.medium': 'thermostat',
  'bell.fill': 'notifications',
  'chart.bar.fill': 'bar-chart',
  'person.fill': 'person',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
