import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const ROLES = [
    { value: 'ADMIN', label: 'Yönetici (Admin)' },
    { value: 'CUTTER', label: 'Kesimci' },
    { value: 'TAILOR', label: 'Terzi / Dikimci' },
    { value: 'QC', label: 'Kalite Kontrol' },
    { value: 'PACKAGER', label: 'Paketleme' },
    { value: 'LOGISTICS', label: 'Lojistik / Kurye' },
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('ADMIN');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('mock_token', 'demo_123');
        localStorage.setItem('mock_role', role);
        localStorage.setItem('mock_user_name', email.split('@')[0] || 'Personel');
        navigate('/dashboard');
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
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="personel@firma.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Şifre</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rol Seçimi</label>
                        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                            {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="button w-full" style={{ marginTop: '0.5rem' }}>
                        <LogIn size={20} />
                        Giriş Yap
                    </button>
                </form>
            </div>
        </div>
    );
}
