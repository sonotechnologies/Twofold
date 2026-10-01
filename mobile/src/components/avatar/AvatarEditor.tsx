import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

import { Avatar } from './Avatar';
import { hairColors, hairStyles, outfitColors, outfits, skinTones, type AvatarConfig } from './avatarOptions';

const tabs = ['Skin', 'Hair', 'Outfit', 'Extras'] as const;
type Tab = (typeof tabs)[number];

export function AvatarEditor({ value, onChange }: { value: AvatarConfig; onChange: (a: AvatarConfig) => void }) {
  const { t } = useTheme();
  const [tab, setTab] = useState<Tab>('Hair');
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...value, ...patch });

  return (
    <View style={{ gap: 14 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {tabs.map((name) => {
          const on = name === tab;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(name)}
              style={[styles.tab, { backgroundColor: on ? t.pb : t.sf }]}
            >
              <Text variant="caption" color={on ? t.pbInk : t.ink2} style={styles.tabText}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'Skin' && <Swatches colors={skinTones} value={value.skin} onPick={(skin) => set({ skin })} size={44} label="Skin tone" />}

      {tab === 'Hair' && (
        <>
          <Grid>
            {hairStyles.map((h) => (
              <Tile key={h.id} label={h.label} selected={value.hair === h.id} onPress={() => set({ hair: h.id })}>
                <View style={{ height: 50, overflow: 'hidden', marginTop: 4 }}>
                  <Avatar {...value} hair={h.id} outfit="tee" c1={t.sf2} c2="#5A1838" scale={0.8} />
                </View>
              </Tile>
            ))}
          </Grid>
          <Swatches colors={hairColors} value={value.hairColor} onPick={(hairColor) => set({ hairColor })} label="Hair colour" />
        </>
      )}

      {tab === 'Outfit' && (
        <>
          <Grid>
            {outfits.map((o) => (
              <Tile key={o.id} label={o.label} selected={value.outfit === o.id} onPress={() => set({ outfit: o.id, c1: o.c1, c2: o.c2 })}>
                <View style={{ height: 50, overflow: 'hidden', marginTop: 4, justifyContent: 'flex-end' }}>
                  <View style={{ marginTop: -26 }}>
                    <Avatar {...value} outfit={o.id} c1={o.c1} c2={o.c2} scale={0.8} />
                  </View>
                </View>
              </Tile>
            ))}
          </Grid>
          <Swatches colors={outfitColors} value={value.c1} onPick={(c1) => set({ c1 })} label="Outfit colour" />
        </>
      )}

      {tab === 'Extras' && (
        <View style={{ gap: 10 }}>
          <Text variant="caption" tone="mu">
            Accent colour: ankara print, agbada panel and gele
          </Text>
          <Swatches colors={outfitColors} value={value.c2} onPick={(c2) => set({ c2 })} label="Accent colour" />
        </View>
      )}
    </View>
  );
}

/** Three equal columns; the last row is padded so tiles keep their width. */
function Grid({ children }: { children: React.ReactNode[] }) {
  const rows: React.ReactNode[][] = [];
  children.forEach((c, i) => (i % 3 === 0 ? rows.push([c]) : rows[rows.length - 1].push(c)));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
          {row}
          {Array.from({ length: 3 - row.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Tile({ label, selected, onPress, children }: { label: string; selected: boolean; onPress: () => void; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: t.sf, borderColor: selected ? t.co : 'transparent' }]}
    >
      {children}
      <Text variant="caption" tone="ink2" style={{ fontSize: 12, paddingTop: 6, paddingBottom: 8, fontFamily: 'Figtree_600SemiBold' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Swatches({ colors, value, onPick, size = 34, label }: { colors: string[]; value: string; onPick: (c: string) => void; size?: number; label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityLabel={label}>
      {colors.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${label} ${c}`}
            onPress={() => onPick(c)}
            style={{ padding: 3, borderRadius: size, borderWidth: 3, borderColor: on ? t.co : 'transparent' }}
          >
            <View style={{ width: size - 6, height: size - 6, borderRadius: size, backgroundColor: c, borderWidth: 1, borderColor: t.ln }} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  tabText: { fontFamily: 'Figtree_600SemiBold', fontSize: 14, lineHeight: 16 },
  tile: { flex: 1, height: 84, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
});
