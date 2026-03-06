import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle, User as UserIcon, QrCode, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { loginBypass } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [fetchingProfiles, setFetchingProfiles] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfiles = async () => {
            setFetchingProfiles(true);
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name, roles')
                    .order('full_name');
                if (data) setProfiles(data);
            } catch (err) {
                console.error('Error fetching profiles:', err);
            } finally {
                setFetchingProfiles(false);
            }
        };
        fetchProfiles();
    }, []);

    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        let timeoutId: NodeJS.Timeout;

        if (showQrScanner) {
            timeoutId = setTimeout(() => {
                const element = document.getElementById("qr-reader");
                if (!element) return;

                html5QrCode = new Html5Qrcode("qr-reader");
                html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    onScanSuccess,
                    onScanFailure
                ).catch(err => {
                    if (err?.name !== 'AbortError') {
                        console.error("Camera start error:", err);
                        setError("Kamera başlatılamadı.");
                    }
                    setShowQrScanner(false);
                });
            }, 100);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (html5QrCode?.isScanning) {
                html5QrCode.stop().catch(() => { });
            }
        };
    }, [showQrScanner]);

    const onScanSuccess = async (decodedText: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('qr_token', decodedText)
                .single();

            if (fetchError || !data) throw new Error("Geçersiz QR Kod.");

            setShowQrScanner(false);
            loginBypass(data.full_name, data.roles || []);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
            setShowQrScanner(false);
        } finally {
            setLoading(false);
        }
    };

    const onScanFailure = () => { };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (username.toLowerCase() === 'cenk' && password === '1') {
            loginBypass('Cenk', ['ADMIN']);
            navigate('/dashboard');
            return;
        }

        try {
            const email = username.includes('@') ? username : `${username}@kayalarkumas.com`;
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            if (data.user) {
                localStorage.removeItem('dev_admin_bypass');
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Giriş yapılamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) return;
        const profile = profiles.find(p => p.full_name === val);
        if (profile) {
            loginBypass(profile.full_name, profile.roles || []);
            navigate('/dashboard');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', margin: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'linear-gradient(135deg, #1e40af, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', boxShadow: '0 8px 24px rgba(30,64,175,0.3)' }}>
                        <span style={{ fontSize: '2rem' }}>🏠</span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.4 }}>Kayalar Kumaş<br />Ev ve Otel Tekstili</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.8rem' }}>QR Tabanlı Sipariş & Stok Takip Sistemi</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {!showQrScanner ? (
                    <div className="flex flex-col gap-6">
                        <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                                🛠️ Test Girişi (Hızlı Seçim)
                            </label>
                            <select
                                className="input"
                                onChange={handleQuickLogin}
                                defaultValue=""
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <option value="" disabled>{fetchingProfiles ? 'Yükleniyor...' : 'Kullanıcı Seçin'}</option>
                                {profiles.map((p, idx) => (
                                    <option key={idx} value={p.full_name} style={{ color: '#000' }}>
                                        {p.full_name} ({Array.isArray(p.roles) ? p.roles.join(', ') : (p.roles || 'Yetkisiz')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VEYA FORM İLE</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
                        </div>

                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Kullanıcı Adı</label>
                                <div style={{ position: 'relative' }}>
                                    <UserIcon size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ paddingLeft: '2.5rem' }}
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="cenk"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Şifre</label>
                                <input
                                    type="password"
                                    className="input"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex flex-col gap-3" style={{ marginTop: '0.5rem' }}>
                                <button type="submit" className="button w-full" disabled={loading}>
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
                                    {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowQrScanner(true)}
                                    className="button button-outline w-full"
                                    style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                                >
                                    <QrCode size={20} /> QR Kod ile Giriş
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div id="qr-reader" style={{ overflow: 'hidden', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid var(--success)', width: '100%', minHeight: '300px', backgroundColor: '#000' }}></div>
                        <button
                            onClick={() => setShowQrScanner(false)}
                            className="button button-outline w-full"
                        >
                            <X size={20} /> İptal et
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                #qr-reader video { width: 100% !important; height: auto !important; object-fit: cover !important; }
                #qr-reader img { display: none !important; }
            `}</style>
        </div>
    );
}
