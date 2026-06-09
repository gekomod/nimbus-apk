// HomeScreen — Main app shell with bottom nav + tabs
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C, FONTS } from '../tokens';
import { Bar, Card, Dot, ModuleHeader, NbIcon, Pill, Ring, Row, SectionTitle, Spark, Spinner, Toggle, useCount } from '../components/ui';
import { ALERTS, CLAMAV, CONTAINERS, DISKS, FIREWALL, INTERFACES, LOGS, MEDIA, POOLS, PROCESSES, SERVER, SERVICES, SYSTEM, UPS, USERS_LIST, VPN } from '../mockData';

// ── Live data hook ────────────────────────────────────────────────────────────
function useLive() {
  const [s, setS] = useState(() => ({
    cpu: SYSTEM.cpu, ram: SYSTEM.ram, temp: SYSTEM.temp,
    down: SYSTEM.down, up: SYSTEM.up,
    cpuHist: Array.from({ length: 30 }, () => 18 + Math.random() * 18),
    netHist: Array.from({ length: 30 }, () => 20 + Math.random() * 40),
  }));
  useEffect(() => {
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const id = setInterval(() => {
      setS(p => {
        const cpu = clamp(p.cpu + (Math.random() - 0.5) * 14, 8, 78);
        const ram = clamp(p.ram + (Math.random() - 0.5) * 4, 52, 72);
        const temp = clamp(p.temp + (Math.random() - 0.5) * 2, 42, 54);
        const down = clamp(p.down + (Math.random() - 0.5) * 30, 2, 118);
        const up = clamp(p.up + (Math.random() - 0.5) * 8, 1, 40);
        return { cpu, ram, temp, down, up, cpuHist: [...p.cpuHist.slice(1), cpu], netHist: [...p.netHist.slice(1), down] };
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);
  return s;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function ServicesCard() {
  const [svc, setSvc] = useState(SERVICES);
  return (
    <Card pad={6}>
      {svc.map((s, i) => (
        <View key={s.name} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.border, paddingHorizontal: 12 }}>
          <Row icon="server" iconTone={s.on ? 'ok' : 'neutral'} title={s.name} sub={s.desc}
            trailing={<Toggle on={s.on} onChange={(v: boolean) => setSvc(svc.map((x, j) => j === i ? { ...x, on: v } : x))} />} />
        </View>
      ))}
    </Card>
  );
}

function Dashboard({ go }: any) {
  const live = useLive();
  const running = CONTAINERS.filter(c => c.status === 'running').length;
  const cpuTemp = Math.round(live.temp);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      {/* greeting */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 13.5, color: C.textDim }}>Dzień dobry</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: FONTS.extrabold, fontSize: 22, color: C.text, letterSpacing: -0.4 }}>{SERVER.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.okDim,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
              <Dot tone="ok" pulse />
              <Text style={{ fontFamily: FONTS.monobold, fontSize: 10.5, color: C.ok, letterSpacing: 0.5 }}>NA ŻYWO</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => go('settings')} activeOpacity={0.75}
          style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.border,
            backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <NbIcon name="settings" size={20} />
        </TouchableOpacity>
      </View>

      {/* health hero */}
      <Card pad={18}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={styles.sLabel}>Stan systemu</Text>
          <Pill tone="ok"><Text style={{ fontFamily: FONTS.monobold, fontSize: 11.5, color: C.ok }}>Wszystkie sprawne</Text></Pill>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 6 }}>
          <Ring value={live.cpu} size={88} color={C.accent} sub="CPU" />
          <Ring value={live.ram} size={88} color={C.purple} sub="RAM" />
          <View style={{ gap: 14, minWidth: 78 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <NbIcon name="thermometer" size={14} color={C.textFaint} />
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textFaint }}>Temp. CPU</Text>
              </View>
              <Text style={{ fontFamily: FONTS.monobold, fontSize: 21, color: cpuTemp > 50 ? C.warn : C.text }}>
                {cpuTemp}°<Text style={{ fontSize: 13, color: C.textFaint }}>C</Text>
              </Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <NbIcon name="clock" size={14} color={C.textFaint} />
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textFaint }}>Uptime</Text>
              </View>
              <Text style={{ fontFamily: FONTS.monobold, fontSize: 15, color: C.text, marginTop: 2 }}>{SERVER.uptime}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16,
          paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12.5, color: C.textDim }}>
            RAM: <Text style={{ fontFamily: FONTS.monobold, color: C.text }}>{SYSTEM.ramUsed} / {SYSTEM.ramTotal} GB</Text>
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12.5, color: C.textDim }}>
            Load: <Text style={{ fontFamily: FONTS.monobold, color: C.text }}>{SYSTEM.load.join('  ')}</Text>
          </Text>
        </View>
      </Card>

      {/* network I/O */}
      <View style={{ height: 14 }} />
      <Card pad={16}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.sLabel}>Ruch sieciowy</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <NbIcon name="arrow_down" size={14} color={C.accent} />
              <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.accent }}>{live.down.toFixed(1)} <Text style={{ color: C.textFaint }}>MB/s</Text></Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <NbIcon name="arrow_up" size={14} color={C.ok} />
              <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.ok }}>{live.up.toFixed(1)} <Text style={{ color: C.textFaint }}>MB/s</Text></Text>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 8 }}><Spark data={live.netHist} color={C.accent} h={46} /></View>
      </Card>

      {/* ZFS pools */}
      <View style={{ height: 18 }} />
      <SectionTitle action="Zobacz wszystkie" onAction={() => go('storage')}>Pule ZFS</SectionTitle>
      <Card pad={6}>
        {POOLS.map((p, i) => (
          <TouchableOpacity key={p.name} onPress={() => go('storage')} activeOpacity={0.75}
            style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <NbIcon name="database" size={18} color={p.status === 'healthy' ? C.accent : C.warn} />
              <Text style={{ fontFamily: FONTS.monobold, fontSize: 15, color: C.text }}>{p.name}</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textFaint }}>{p.raid}</Text>
              <View style={{ flex: 1 }} />
              <Pill tone={p.status === 'healthy' ? 'ok' : 'warn'}>
                <Text style={{ fontFamily: FONTS.monobold, fontSize: 11.5, color: p.status === 'healthy' ? C.ok : C.warn }}>
                  {p.status === 'healthy' ? 'Sprawny' : 'Ostrzeżenie'}
                </Text>
              </Pill>
            </View>
            <Bar value={p.usedPct} color={p.usedPct > 85 ? C.warn : C.accent} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim }}>{p.used} TB użyte</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim }}>{(p.total - p.used).toFixed(1)} TB wolne</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>

      {/* containers + security */}
      <View style={{ height: 18 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card pad={16} onPress={() => go('docker')} style={{ flex: 1, gap: 4 }}>
          <NbIcon name="box" size={22} color={C.accent} />
          <Text style={{ fontFamily: FONTS.extrabold, fontSize: 30, color: C.text, marginTop: 6 }}>
            {running}<Text style={{ fontSize: 16, color: C.textFaint, fontFamily: FONTS.regular }}>/{CONTAINERS.length}</Text>
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: C.textDim }}>Kontenery · uruchomione</Text>
        </Card>
        <Card pad={16} onPress={() => go('antivirus')} style={{ flex: 1, gap: 4 }}>
          <NbIcon name="shield_check" size={22} color={C.ok} />
          <Text style={{ fontFamily: FONTS.extrabold, fontSize: 30, color: C.text, marginTop: 6 }}>0</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: C.textDim }}>Zagrożenia · Chroniony</Text>
        </Card>
      </View>

      {/* services */}
      <View style={{ height: 18 }} />
      <SectionTitle>Usługi</SectionTitle>
      <ServicesCard />

      {/* alerts */}
      <View style={{ height: 18 }} />
      <SectionTitle action="Zobacz wszystkie" onAction={() => go('notifications')}>Powiadomienia</SectionTitle>
      <Card pad={6}>
        {ALERTS.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
            <View style={{ marginTop: 2 }}>
              <NbIcon name={a.lvl === 'warn' ? 'alert' : a.lvl === 'ok' ? 'check' : 'bell'} size={18}
                color={a.lvl === 'warn' ? C.warn : a.lvl === 'ok' ? C.ok : C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.semibold, fontSize: 14.5, color: C.text, flex: 1 }}>{a.title}</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11.5, color: C.textFaint }}>{a.time}</Text>
              </View>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: C.textDim, marginTop: 2 }}>{a.text}</Text>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

// ── Storage ───────────────────────────────────────────────────────────────────
function StorageScreen({ go }: any) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Magazyn" />
      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle>Pule ZFS</SectionTitle>
        {POOLS.map(p => (
          <View key={p.name} style={{ marginBottom: 12 }}>
            <Card pad={16}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Ring value={p.usedPct} size={72} sw={8} color={p.usedPct > 85 ? C.warn : C.accent} sub="użyte" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: FONTS.monobold, fontSize: 18, color: C.text }}>{p.name}</Text>
                    <Pill tone={p.status === 'healthy' ? 'ok' : 'warn'}>
                      <Text style={{ fontFamily: FONTS.monobold, fontSize: 11, color: p.status === 'healthy' ? C.ok : C.warn }}>
                        {p.status === 'healthy' ? 'Sprawny' : 'Ostrzeżenie'}
                      </Text>
                    </Pill>
                  </View>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12.5, color: C.textDim, marginTop: 4 }}>{p.raid}</Text>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.text, marginTop: 8 }}>{p.used} / {p.total} TB</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <NbIcon name={p.smart === 'passed' ? 'shield_check' : 'alert'} size={14}
                      color={p.smart === 'passed' ? C.ok : C.warn} />
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textFaint }}>S.M.A.R.T.:</Text>
                    <Text style={{ fontFamily: FONTS.monobold, fontSize: 12, color: p.smart === 'passed' ? C.ok : C.warn }}>
                      {p.smart === 'passed' ? 'PASSED' : 'WARN'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        ))}

        <View style={{ height: 8 }} />
        <SectionTitle>Dyski fizyczne</SectionTitle>
        <Card pad={6}>
          {DISKS.map((d, i) => (
            <View key={d.dev} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.monobold, fontSize: 14, color: C.text }}>{d.dev}</Text>
                <Pill tone={d.smart === 'passed' ? 'ok' : 'warn'}>
                  <Text style={{ fontFamily: FONTS.monobold, fontSize: 11, color: d.smart === 'passed' ? C.ok : C.warn }}>
                    {d.smart === 'passed' ? 'PASSED' : 'WARN'}
                  </Text>
                </Pill>
              </View>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: C.textDim, marginTop: 3 }}>{d.model}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint }}>🌡 {d.temp}°C</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint }}>⏱ {d.hours}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ── Docker ────────────────────────────────────────────────────────────────────
function DockerScreen({ go }: any) {
  const [containers, setContainers] = useState(CONTAINERS);
  const toggle = (name: string) => setContainers((cs: typeof CONTAINERS) =>
    cs.map(c => c.name === name ? { ...c, status: c.status === 'running' ? 'stopped' : 'running' } : c));
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Docker" />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
          <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.extrabold, fontSize: 28, color: C.accent }}>
              {containers.filter(c => c.status === 'running').length}
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textDim }}>Uruchomione</Text>
          </Card>
          <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.extrabold, fontSize: 28, color: C.textFaint }}>
              {containers.filter(c => c.status === 'stopped').length}
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textDim }}>Zatrzymane</Text>
          </Card>
        </View>
        <Card pad={6}>
          {containers.map((c, i) => (
            <View key={c.name} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Dot tone={c.status === 'running' ? 'ok' : 'off'} />
                    <Text style={{ fontFamily: FONTS.semibold, fontSize: 15, color: C.text }}>{c.name}</Text>
                  </View>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: C.textFaint, marginTop: 3 }}>{c.image}</Text>
                  {c.status === 'running' && (
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: C.textDim, marginTop: 3 }}>
                      CPU {c.cpu}% · RAM {c.ram} MB · :{c.port}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => toggle(c.name)} activeOpacity={0.75}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: c.status === 'running' ? C.dangerDim : C.okDim }}>
                  <Text style={{ fontFamily: FONTS.semibold, fontSize: 13,
                    color: c.status === 'running' ? C.danger : C.ok }}>
                    {c.status === 'running' ? 'Stop' : 'Start'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ── Network ───────────────────────────────────────────────────────────────────
function NetworkScreen({ go }: any) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Sieć" />
      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle>Interfejsy</SectionTitle>
        <Card pad={6}>
          {INTERFACES.map((iface, i) => (
            <View key={iface.name} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Dot tone={iface.up ? 'ok' : 'off'} />
                  <View>
                    <Text style={{ fontFamily: FONTS.monobold, fontSize: 15, color: C.text }}>{iface.name}</Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim }}>{iface.ip}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint }}>{iface.speed}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ height: 18 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card pad={14} style={{ flex: 1 }}>
            <NbIcon name="shield" size={20} color={FIREWALL.enabled ? C.ok : C.textFaint} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginTop: 8 }}>Zapora</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim }}>{FIREWALL.rules} reguł · {FIREWALL.enabled ? 'włączona' : 'wyłączona'}</Text>
          </Card>
          <Card pad={14} style={{ flex: 1 }}>
            <NbIcon name="lock" size={20} color={C.accent} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: C.text, marginTop: 8 }}>WireGuard</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim }}>{VPN.peers} klientów · {VPN.online} online</Text>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Media ─────────────────────────────────────────────────────────────────────
function MediaScreen({ go }: any) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Media" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        {MEDIA.map((m, i) => (
          <View key={m.name} style={{ marginBottom: 12 }}>
            <Card pad={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.accentDim,
                  alignItems: 'center', justifyContent: 'center' }}>
                  <NbIcon name={m.kind === 'music' ? 'music' : 'film'} size={22} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: FONTS.semibold, fontSize: 16, color: C.text }}>{m.name}</Text>
                    <Dot tone={m.status === 'online' ? 'ok' : 'off'} />
                  </View>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim }}>{m.lib}</Text>
                  {m.status === 'online' && m.streams > 0 &&
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.ok }}>{m.streams} strumienie aktywne</Text>}
                </View>
              </View>
            </Card>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Antivirus ─────────────────────────────────────────────────────────────────
function AntivirusScreen({ go }: any) {
  const [scanning, setScanning] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const startScan = () => {
    setScanning(true);
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })).start();
    setTimeout(() => { setScanning(false); spin.stopAnimation(); spin.setValue(0); }, 3000);
  };
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Antywirus" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={18}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Animated.View style={{ transform: [{ rotate: scanning ? rotate : '0deg' }] }}>
              <NbIcon name="shield_check" size={64} color={CLAMAV.protected ? C.ok : C.danger} />
            </Animated.View>
            <Text style={{ fontFamily: FONTS.extrabold, fontSize: 22, color: C.text, marginTop: 12 }}>
              {scanning ? 'Skanowanie…' : 'Chroniony'}
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: C.textDim, marginTop: 4 }}>
              Ochrona w czasie rzeczywistym · {CLAMAV.lastScan}
            </Text>
          </View>
        </Card>
        <View style={{ height: 14 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { label: 'Zagrożenia', val: CLAMAV.threats, tone: 'ok' },
            { label: 'Kwarantanna', val: CLAMAV.quarantine, tone: 'warn' },
          ].map(item => (
            <Card key={item.label} pad={14} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.extrabold, fontSize: 28, color: item.tone === 'ok' ? C.ok : C.warn }}>{item.val}</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: C.textDim }}>{item.label}</Text>
            </Card>
          ))}
        </View>
        <View style={{ height: 18 }} />
        <TouchableOpacity onPress={startScan} disabled={scanning} activeOpacity={0.8}
          style={{ height: 54, borderRadius: 14, backgroundColor: C.accent,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
          {scanning ? <Spinner color="#08111c" /> : <NbIcon name="scan" size={20} color="#08111c" />}
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#08111c' }}>
            {scanning ? 'Skanowanie…' : 'Skanuj teraz'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── UPS ───────────────────────────────────────────────────────────────────────
function UpsScreen({ go }: any) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Zasilanie (UPS)" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={18}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ring value={UPS.battery} size={110} sw={11} color={C.ok} label={`${UPS.battery}%`} sub="bateria" />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: C.text, marginTop: 16 }}>{UPS.model}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Dot tone={UPS.mode === 'on_line' ? 'ok' : 'warn'} />
              <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: UPS.mode === 'on_line' ? C.ok : C.warn }}>
                {UPS.mode === 'on_line' ? 'Z sieci' : 'Na baterii'}
              </Text>
            </View>
          </View>
        </Card>
        <View style={{ height: 14 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { label: 'Czas podtrzymania', val: UPS.runtime },
            { label: 'Napięcie', val: `${UPS.voltage} V` },
            { label: 'Obciążenie', val: `${UPS.load}%` },
          ].map(item => (
            <Card key={item.label} pad={14} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.monobold, fontSize: 18, color: C.text }}>{item.val}</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: C.textDim, marginTop: 3, textAlign: 'center' }}>{item.label}</Text>
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Processes ─────────────────────────────────────────────────────────────────
function ProcessesScreen({ go }: any) {
  const [procs, setProcs] = useState(PROCESSES);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Procesy" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={6}>
          <View style={{ padding: 12, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border }}>
            {['PID', 'Nazwa', 'CPU%', 'MEM%', ''].map((h, i) => (
              <Text key={i} style={{ fontFamily: FONTS.monobold, fontSize: 11, color: C.textFaint,
                flex: i === 1 ? 2 : 1, textAlign: i > 1 ? 'right' : 'left' }}>{h}</Text>
            ))}
          </View>
          {procs.map((p, i) => (
            <View key={p.pid} style={{ padding: 12, flexDirection: 'row', alignItems: 'center',
              borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint, flex: 1 }}>{p.pid}</Text>
              <Text style={{ fontFamily: FONTS.semibold, fontSize: 13, color: C.text, flex: 2 }} numberOfLines={1}>{p.name}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: p.cpu > 8 ? C.warn : C.textDim, flex: 1, textAlign: 'right' }}>{p.cpu}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textDim, flex: 1, textAlign: 'right' }}>{p.mem}</Text>
              <TouchableOpacity onPress={() => setProcs(ps => ps.filter(x => x.pid !== p.pid))}
                style={{ padding: 4 }}>
                <NbIcon name="x" size={16} color={C.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ── Logs ──────────────────────────────────────────────────────────────────────
function LogsScreen({ go }: any) {
  const lvlColor = (lvl: string) => ({ info: C.textDim, warn: C.warn, err: C.danger }[lvl] || C.textDim);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Logi systemowe" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={6}>
          {LOGS.map((entry, i) => (
            <View key={i} style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontFamily: FONTS.monobold, fontSize: 11, color: lvlColor(entry.lvl),
                  textTransform: 'uppercase', minWidth: 36 }}>{entry.lvl}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint }}>{entry.t}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent }}>[{entry.src}]</Text>
              </View>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.text, lineHeight: 18 }}>{entry.msg}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersScreen({ go }: any) {
  const [users, setUsers] = useState(USERS_LIST);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Użytkownicy" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={6}>
          {users.map((u, i) => (
            <View key={u.name} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.border, paddingHorizontal: 12 }}>
              <Row icon="user" iconTone={u.on ? 'accent' : 'neutral'} title={u.name} sub={`${u.role} · ${u.groups}`}
                trailing={<Toggle on={u.on} onChange={(v: boolean) => setUsers((us: typeof USERS_LIST) => us.map((x, j) => j === i ? { ...x, on: v } : x))} />} />
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
function NotificationsScreen({ go }: any) {
  const icon = (lvl: string) => lvl === 'warn' ? 'alert' : lvl === 'ok' ? 'check' : 'bell';
  const color = (lvl: string) => lvl === 'warn' ? C.warn : lvl === 'ok' ? C.ok : C.accent;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Powiadomienia" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={6}>
          {ALERTS.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, padding: 14,
              borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.surface2,
                alignItems: 'center', justifyContent: 'center' }}>
                <NbIcon name={icon(a.lvl)} size={19} color={color(a.lvl)} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.semibold, fontSize: 14.5, color: C.text }}>{a.title}</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 11.5, color: C.textFaint }}>{a.time}</Text>
                </View>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: C.textDim, marginTop: 3 }}>{a.text}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ── Terminal ──────────────────────────────────────────────────────────────────
function TerminalScreen({ go }: any) {
  const [lines, setLines] = useState(['nimbus@nas:~$ ', '']);
  const [input, setInput] = useState('');
  const send = () => {
    if (!input.trim()) return;
    setLines(ls => [...ls.slice(0, -1), `nimbus@nas:~$ ${input}`, `bash: ${input}: command not found`, '']);
    setInput('');
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0c0f' }}>
      <ModuleHeader title="Terminal" onBack={() => go('__back')} />
      <ScrollView style={{ flex: 1, paddingHorizontal: 14 }}>
        {lines.map((l, i) => (
          <Text key={i} style={{ fontFamily: FONTS.mono, fontSize: 13, color: l.includes('command not found') ? C.danger : C.text, lineHeight: 22 }}>{l}</Text>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.border }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2,
          borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.ok }}>$ </Text>
          <TextInput value={input} onChangeText={setInput} onSubmitEditing={send}
            style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 13, color: C.text, height: 42 }}
            placeholderTextColor={C.textFaint} placeholder="Wpisz polecenie…" autoCapitalize="none" autoCorrect={false} />
        </View>
        <TouchableOpacity onPress={send} activeOpacity={0.8}
          style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: C.accent,
            alignItems: 'center', justifyContent: 'center' }}>
          <NbIcon name="arrow_up" size={18} color="#08111c" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsScreen({ go, onLogout }: any) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Ustawienia" onBack={() => go('__back')} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={6}>
          <View style={{ paddingHorizontal: 12 }}>
            <Row icon="server" iconTone="accent" title="Serwer" sub={SERVER.host} />
          </View>
          <View style={{ height: 1, backgroundColor: C.border }} />
          <View style={{ paddingHorizontal: 12 }}>
            <Row icon="user" iconTone="accent" title="Konto" sub="admin" />
          </View>
          <View style={{ height: 1, backgroundColor: C.border }} />
          <View style={{ paddingHorizontal: 12 }}>
            <Row icon="activity" iconTone="ok" title="Nimbus" sub={`${SERVER.version} · ${SERVER.os}`} />
          </View>
        </Card>
        <View style={{ height: 24 }} />
        <TouchableOpacity onPress={onLogout} activeOpacity={0.8}
          style={{ height: 54, borderRadius: 14, backgroundColor: C.dangerDim,
            borderWidth: 1, borderColor: C.danger, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 10 }}>
          <NbIcon name="logout" size={20} color={C.danger} />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: C.danger }}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── More grid ─────────────────────────────────────────────────────────────────
const MODULE_META = [
  { id: 'media', icon: 'film', tone: 'accent', label: 'Media' },
  { id: 'antivirus', icon: 'shield_check', tone: 'ok', label: 'Antywirus' },
  { id: 'ups', icon: 'battery', tone: 'ok', label: 'Zasilanie' },
  { id: 'processes', icon: 'activity', tone: 'accent', label: 'Procesy' },
  { id: 'logs', icon: 'file', tone: 'neutral', label: 'Logi' },
  { id: 'users', icon: 'users', tone: 'accent', label: 'Użytkownicy' },
  { id: 'notifications', icon: 'bell', tone: 'warn', label: 'Powiadomienia' },
  { id: 'terminal', icon: 'terminal', tone: 'neutral', label: 'Terminal' },
  { id: 'settings', icon: 'settings', tone: 'neutral', label: 'Ustawienia' },
];

const TONE_COLORS: Record<string, [string, string]> = {
  accent:  [C.accent,  C.accentDim],
  ok:      [C.ok,      C.okDim],
  warn:    [C.warn,    C.warnDim],
  neutral: [C.textDim, 'rgba(255,255,255,0.05)'],
};

function MoreGrid({ go }: any) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader title="Więcej" />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MODULE_META.map(m => {
            const [fg, bg] = TONE_COLORS[m.tone] || TONE_COLORS.accent;
            return (
              <TouchableOpacity key={m.id} onPress={() => go(m.id)} activeOpacity={0.75}
                style={[styles.moreCard, { width: '30%' }]}>
                <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: bg,
                  alignItems: 'center', justifyContent: 'center' }}>
                  <NbIcon name={m.icon} size={23} color={fg} />
                </View>
                <Text style={{ fontFamily: FONTS.semibold, fontSize: 12.5, color: C.text, marginTop: 8, textAlign: 'center', lineHeight: 17 }}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', icon: 'gauge', label: 'Pulpit' },
  { id: 'storage', icon: 'database', label: 'Magazyn' },
  { id: 'docker', icon: 'box', label: 'Docker' },
  { id: 'network', icon: 'globe', label: 'Sieć' },
  { id: 'more', icon: 'grid', label: 'Więcej' },
];

function BottomNav({ tab, onTab }: any) {
  return (
    <View style={styles.bottomNav}>
      {TABS.map(it => {
        const on = tab === it.id;
        return (
          <TouchableOpacity key={it.id} onPress={() => onTab(it.id)} activeOpacity={0.7} style={styles.navItem}>
            <View style={[styles.navPill, on && styles.navPillActive]}>
              <NbIcon name={it.icon} size={22} color={on ? C.accent : C.textFaint} stroke={on ? 2 : 1.8} />
            </View>
            <Text style={[styles.navLabel, on && styles.navLabelActive]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── HomeScreen (main shell) ───────────────────────────────────────────────────
const TAB_IDS = TABS.map(t => t.id);

interface Props {
  serverUrl?: string;
  userData?: any;
  onLogout: () => void;
}

export default function HomeScreen({ onLogout }: Props) {
  const [tab, setTab] = useState('dashboard');
  const [stack, setStack] = useState<string | null>(null);
  const prevTab = useRef('dashboard');

  const go = (target: string) => {
    if (target === '__logout') { setStack(null); setTab('dashboard'); onLogout(); return; }
    if (target === '__back') { setStack(null); return; }
    if (TAB_IDS.includes(target)) { setStack(null); setTab(target); return; }
    prevTab.current = tab; setStack(target);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack) { setStack(null); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack]);

  const tabView = {
    dashboard: <Dashboard go={go} />,
    storage: <StorageScreen go={go} />,
    docker: <DockerScreen go={go} />,
    network: <NetworkScreen go={go} />,
    more: <MoreGrid go={go} />,
  }[tab];

  const stackView = stack && {
    media: <MediaScreen go={go} />,
    antivirus: <AntivirusScreen go={go} />,
    ups: <UpsScreen go={go} />,
    processes: <ProcessesScreen go={go} />,
    logs: <LogsScreen go={go} />,
    users: <UsersScreen go={go} />,
    notifications: <NotificationsScreen go={go} />,
    terminal: <TerminalScreen go={go} />,
    settings: <SettingsScreen go={go} onLogout={() => go('__logout')} />,
  }[stack];

  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>{tabView}</View>
      <BottomNav tab={tab} onTab={(id: string) => { setStack(null); setTab(id); }} />
      {stack && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.stackScreen}>{stackView}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  sLabel: { fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', color: C.textFaint },
  bottomNav: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 8, paddingBottom: 6, paddingHorizontal: 6,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navPill: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: 99 },
  navPillActive: { backgroundColor: C.accentDim },
  navLabel: { fontFamily: FONTS.medium, fontSize: 10.5, color: C.textFaint },
  navLabelActive: { fontFamily: FONTS.bold, color: C.accent },
  moreCard: {
    backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 14, alignItems: 'center', justifyContent: 'center', minHeight: 96,
  },
  stackScreen: { flex: 1, backgroundColor: C.bg },
});
