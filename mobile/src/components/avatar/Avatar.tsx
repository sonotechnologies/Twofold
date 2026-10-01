// Stylised 2D avatar, ported from TwofoldAvatar.dc.html (a 64×96 figure built from simple shapes).
// These are stand-ins in the target style until final illustration arrives.
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, Rect } from 'react-native-svg';

import { normalizeAvatar, type AvatarConfig } from './avatarOptions';

const W = 64;
const H = 96;
const TOP_BLEED = 6; // the gele knot pokes 6px above the box
const SHADOW_HAIR = '#3A2420';
const FACE_INK = '#1A0A10';
const CHEEK = '#FF7A66';

/** Rounded rectangle path with per-corner radii, scaled down like CSS border-radius when they overlap. */
function rrect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]) {
  const f = Math.min(1, w / (tl + tr), w / (bl + br), h / (tl + bl), h / (tr + br));
  [tl, tr, br, bl] = [tl * f, tr * f, br * f, bl * f];
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    `A${tr},${tr} 0 0 1 ${x + w},${y + tr}`,
    `V${y + h - br}`,
    `A${br},${br} 0 0 1 ${x + w - br},${y + h}`,
    `H${x + bl}`,
    `A${bl},${bl} 0 0 1 ${x},${y + h - bl}`,
    `V${y + tl}`,
    `A${tl},${tl} 0 0 1 ${x + tl},${y}`,
    'Z',
  ].join(' ');
}

type Props = Partial<AvatarConfig> & { config?: unknown; scale?: number };

export function Avatar({ config, scale = 1, ...overrides }: Props) {
  const a = { ...normalizeAvatar(config), ...stripUndefined(overrides) };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const hc = a.hairColor;
  const agbada = a.outfit === 'agbada';
  const bodyX = agbada ? 1 : 6;
  const bodyW = agbada ? 62 : 52;
  const body = (x: number, w: number) => rrect(x, H - 44, w, 44, [26, 26, 12, 12]);

  return (
    <View style={{ width: W * scale, height: H * scale }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg
        width={W * scale}
        height={(H + TOP_BLEED) * scale}
        viewBox={`0 ${-TOP_BLEED} ${W} ${H + TOP_BLEED}`}
        style={{ position: 'absolute', top: -TOP_BLEED * scale, left: 0 }}
      >
        <Defs>
          {/* braids: horizontal bands down the strands */}
          <Pattern id={`bs${uid}`} patternUnits="userSpaceOnUse" x={0} y={20} width={W} height={8}>
            <Rect width={W} height={6} fill={hc} />
            <Rect y={6} width={W} height={2} fill={SHADOW_HAIR} />
          </Pattern>
          {/* braids top: fine vertical parting */}
          <Pattern id={`bt${uid}`} patternUnits="userSpaceOnUse" x={13} y={0} width={5} height={H}>
            <Rect width={4} height={H} fill={hc} />
            <Rect x={4} width={1} height={H} fill={SHADOW_HAIR} />
          </Pattern>
          {/* cornrows: wider rows */}
          <Pattern id={`cr${uid}`} patternUnits="userSpaceOnUse" x={13} y={0} width={5} height={H}>
            <Rect width={3} height={H} fill={hc} />
            <Rect x={3} width={2} height={H} fill={SHADOW_HAIR} />
          </Pattern>
          {/* ankara: dotted print */}
          <Pattern id={`ak${uid}`} patternUnits="userSpaceOnUse" x={6} y={H - 44} width={9} height={9}>
            <Circle cx={4.5} cy={4.5} r={2.8} fill={a.c2} />
          </Pattern>
        </Defs>

        {/* hair behind the head */}
        {a.hair === 'afro' && <Ellipse cx={32} cy={25} rx={28} ry={25} fill={hc} />}
        {a.hair === 'braids' && (
          <G>
            <Path d={rrect(9, 20, 11, 56, [5.5, 5.5, 5.5, 5.5])} fill={`url(#bs${uid})`} />
            <Path d={rrect(44, 20, 11, 56, [5.5, 5.5, 5.5, 5.5])} fill={`url(#bs${uid})`} />
            <Circle cx={32} cy={8} r={8} fill={hc} />
          </G>
        )}
        {a.hair === 'locs' && (
          <G fill={hc}>
            <Rect x={8} y={18} width={8} height={48} rx={4} />
            <Rect x={15} y={22} width={8} height={52} rx={4} />
            <Rect x={41} y={22} width={8} height={52} rx={4} />
            <Rect x={48} y={18} width={8} height={48} rx={4} />
          </G>
        )}

        {/* outfit */}
        <Path d={body(bodyX, bodyW)} fill={a.c1} />
        {a.outfit === 'ankara' && <Path d={body(6, 52)} fill={`url(#ak${uid})`} />}
        {agbada && <Rect x={26} y={H - 36} width={12} height={30} rx={6} fill={a.c2} />}
        {a.outfit === 'hoodie' && <Rect x={20} y={H - 20} width={24} height={12} rx={6} fill={a.c2} />}

        {/* neck, head, face */}
        <Rect x={26} y={42} width={12} height={10} rx={4} fill={a.skin} />
        <Circle cx={32} cy={30} r={18} fill={a.skin} />
        <Ellipse cx={26} cy={30.5} rx={2} ry={2.5} fill={FACE_INK} />
        <Ellipse cx={38} cy={30.5} rx={2} ry={2.5} fill={FACE_INK} />
        <Path d="M28 37 Q32 41.2 36 37" stroke={FACE_INK} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Ellipse cx={21} cy={34.5} rx={3} ry={1.5} fill={CHEEK} opacity={0.55} />
        <Ellipse cx={43} cy={34.5} rx={3} ry={1.5} fill={CHEEK} opacity={0.55} />

        {/* hair on top */}
        {a.hair === 'fade' && <Path d={rrect(13, 10, 38, 15, [19, 19, 6, 6])} fill={hc} />}
        {a.hair === 'afro' && <Path d={rrect(13, 8, 38, 14, [19, 19, 8, 8])} fill={hc} />}
        {a.hair === 'braids' && <Path d={rrect(13, 10, 38, 14, [19, 19, 6, 6])} fill={`url(#bt${uid})`} />}
        {a.hair === 'locs' && <Path d={rrect(12, 9, 40, 16, [20, 20, 8, 8])} fill={hc} />}
        {a.hair === 'cornrows' && <Path d={rrect(13, 10, 38, 15, [19, 19, 6, 6])} fill={`url(#cr${uid})`} />}
        {a.hair === 'headwrap' && (
          <G>
            <Path d={rrect(8, 0, 48, 26, [24, 24, 8, 8])} fill={a.c2} />
            <Ellipse cx={50} cy={2} rx={10} ry={8} fill={a.c2} />
            <Rect x={8} y={16} width={48} height={4} fill={a.c1} opacity={0.6} />
          </G>
        )}
      </Svg>
    </View>
  );
}

/** Avatar cropped into a circle (chat header, answers, leaderboard). */
export function AvatarBadge({ config, size = 44, background, ring }: { config?: unknown; size?: number; background: string; ring?: string }) {
  const scale = size / 44;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        overflow: 'hidden',
        borderWidth: ring ? 2 : 0,
        borderColor: ring,
      }}
    >
      <View style={{ position: 'absolute', left: -10 * scale, top: -2 * scale }}>
        <Avatar config={config} scale={scale} />
      </View>
    </View>
  );
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
