import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';

type Props = {
    id: string;
    label: string;
    subLabel?: string;
    onClose: () => void;
};

export default function QRPrintModal({ id, label, subLabel, onClose }: Props) {
    const printAreaRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printAreaRef.current) return;
        const printContent = printAreaRef.current.innerHTML;
        const win = window.open('', '_blank', 'width=400,height=500');
        if (!win) return;
        win.document.write(`
      <html><head><title>QR Etiket — ${id}</title>
      <style>
        body { margin:0; padding:20px; font-family:Arial,sans-serif; display:flex; justify-content:center; }
        .label { border:2px dashed #ccc; padding:20px; text-align:center; width:280px; }
        .label h2 { margin:0 0 4px 0; font-size:14px; }
        .label p { margin:0; font-size:11px; color:#666; }
        .label svg { margin:16px 0; }
        .label .id { font-size:16px; font-weight:bold; letter-spacing:1px; margin-top:8px; }
        @media print { body { padding:0; } .label { border:2px solid #000; } }
      </style></head><body>
      <div class="label">${printContent}</div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
        win.document.close();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem'
        }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>QR Etiket</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Print area */}
                <div ref={printAreaRef} style={{ padding: '1.5rem', border: '2px dashed var(--border-color)', borderRadius: '12px', marginBottom: '1rem' }}>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>Kayalar Kumaş</h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
                    <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
                        <QRCodeSVG value={id} size={180} level="H" includeMargin />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '1px' }}>{id}</div>
                    {subLabel && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{subLabel}</p>}
                </div>

                <button onClick={handlePrint} className="button w-full" style={{ gap: '0.5rem' }}>
                    <Printer size={20} /> Etiketi Yazdır
                </button>
            </div>
        </div>
    );
}
