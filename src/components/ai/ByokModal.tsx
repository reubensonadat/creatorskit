'use client';

import React, { useState, useEffect } from 'react';
import {
    AI_PROVIDERS,
    AiProvider,
    getStoredAiKey,
    setStoredAiKey,
    hasStoredAiKey,
    getActiveAiProvider,
    setActiveAiProvider,
    getStoredAiModel,
    setStoredAiModel,
} from '@/lib/ai-keyring';
import { Key, X, ExternalLink, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface ByokModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialProvider?: AiProvider;
    onKeySaved?: (provider: AiProvider, key: string) => void;
}

export function ByokModal({ isOpen, onClose, initialProvider, onKeySaved }: ByokModalProps) {
    const [selectedProvider, setSelectedProvider] = useState<AiProvider>('gemini');
    const [keyInputs, setKeyInputs] = useState<Record<AiProvider, string>>({
        gemini: '',
        openai: '',
        groq: '',
    });
    const [currentModel, setCurrentModel] = useState<string>('');
    const [showKey, setShowKey] = useState(false);
    const [savedStatus, setSavedStatus] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const active = initialProvider || getActiveAiProvider();
            setSelectedProvider(active);
            setKeyInputs({
                gemini: getStoredAiKey('gemini'),
                openai: getStoredAiKey('openai'),
                groq: getStoredAiKey('groq'),
            });
            setCurrentModel(getStoredAiModel(active));
            setSavedStatus(null);
        }
    }, [isOpen, initialProvider]);

    if (!isOpen) return null;

    const currentConfig = AI_PROVIDERS[selectedProvider];
    const currentKey = keyInputs[selectedProvider] || '';
    const hasCurrentKey = Boolean(currentKey.trim());

    const handleProviderChange = (p: AiProvider) => {
        setSelectedProvider(p);
        setCurrentModel(getStoredAiModel(p));
        setSavedStatus(null);
    };

    const handleSave = () => {
        setStoredAiKey(selectedProvider, currentKey);
        setActiveAiProvider(selectedProvider);
        if (currentModel) {
            setStoredAiModel(selectedProvider, currentModel);
        }
        setSavedStatus(`Saved ${currentConfig.label} Key & Model!`);
        if (onKeySaved) {
            onKeySaved(selectedProvider, currentKey.trim());
        }
        setTimeout(() => {
            setSavedStatus(null);
        }, 2000);
    };

    const handleClear = () => {
        setKeyInputs((prev) => ({ ...prev, [selectedProvider]: '' }));
        setStoredAiKey(selectedProvider, '');
        setSavedStatus(`Cleared ${currentConfig.label} Key`);
        if (onKeySaved) {
            onKeySaved(selectedProvider, '');
        }
        setTimeout(() => setSavedStatus(null), 2000);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(3px)',
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    border: '3px solid #000000',
                    boxShadow: '6px 6px 0px #000000',
                    width: '100%',
                    maxWidth: 520,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    padding: 20,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Key size={18} />
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'monospace', margin: 0, letterSpacing: '0.04em' }}>
                                AI SETTINGS · BRING YOUR KEY
                            </h2>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.64rem', color: '#555', fontFamily: 'monospace' }}>
                            Shared suite-wide across Demystifier, Auto-Captions & Text-Behind. Stored only in your browser.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: '2px solid #000',
                            background: '#fff',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Provider Selector Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {(['gemini', 'groq', 'openai'] as const).map((pid) => {
                        const prov = AI_PROVIDERS[pid];
                        const isSelected = selectedProvider === pid;
                        const hasKey = hasStoredAiKey(pid);
                        return (
                            <button
                                key={pid}
                                type="button"
                                onClick={() => handleProviderChange(pid)}
                                style={{
                                    border: '2px solid #000',
                                    padding: '8px 6px',
                                    textAlign: 'center',
                                    background: isSelected ? '#FFE500' : hasKey ? '#F0FDF4' : '#FAFAFA',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    alignItems: 'center',
                                    position: 'relative',
                                }}
                            >
                                <div style={{ fontWeight: 900, fontSize: '0.72rem', fontFamily: 'monospace' }}>
                                    {prov.label.replace('Google ', '').replace(' Cloud', '')}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.52rem',
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                        color: hasKey ? '#16A34A' : isSelected ? '#000' : '#888',
                                    }}
                                >
                                    {hasKey ? 'KEY READY' : pid === 'gemini' ? 'FREE KEY' : 'BYOK'}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Key Input Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#FAFAFA', border: '1.5px solid #000', padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace' }}>
                            {currentConfig.label.toUpperCase()} API KEY
                        </div>
                        <a
                            href={currentConfig.keyUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: '#000',
                                textDecoration: 'underline',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                            }}
                        >
                            GET FREE KEY <ExternalLink size={10} />
                        </a>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={currentKey}
                                onChange={(e) =>
                                    setKeyInputs((prev) => ({ ...prev, [selectedProvider]: e.target.value }))
                                }
                                placeholder={currentConfig.keyPlaceholder}
                                style={{
                                    width: '100%',
                                    padding: '8px 36px 8px 10px',
                                    border: '2px solid #000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.74rem',
                                    background: '#fff',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#555',
                                }}
                            >
                                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            style={{
                                border: '2px solid #000',
                                background: '#FFE500',
                                color: '#000',
                                padding: '8px 14px',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Check size={14} /> SAVE
                        </button>

                        {hasCurrentKey && (
                            <button
                                type="button"
                                onClick={handleClear}
                                style={{
                                    border: '2px solid #000',
                                    background: '#fff',
                                    color: '#FF4D4D',
                                    padding: '8px 10px',
                                    fontWeight: 900,
                                    fontSize: '0.72rem',
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                }}
                                title="Remove key from browser storage"
                            >
                                CLEAR
                            </button>
                        )}
                    </div>

                    {/* Auto-Picked Model Selection */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 6, borderTop: '1px dashed #DDD' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace', color: '#555' }}>
                            AUTO-PICKED MODEL:
                        </div>
                        <select
                            value={currentModel}
                            onChange={(e) => {
                                const m = e.target.value;
                                setCurrentModel(m);
                                setStoredAiModel(selectedProvider, m);
                            }}
                            style={{
                                padding: '3px 8px',
                                fontSize: '0.62rem',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                border: '1.5px solid #000',
                                background: '#FFF',
                            }}
                        >
                            {currentConfig.availableModels.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    {savedStatus && (
                        <div
                            style={{
                                background: '#00FF88',
                                border: '1.5px solid #000',
                                padding: '4px 8px',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                textAlign: 'center',
                            }}
                        >
                            {savedStatus}
                        </div>
                    )}
                </div>

                {/* 3-Step Guide */}
                <div style={{ border: '1.5px solid #000', background: '#F9F9F9', padding: 12 }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 900, fontFamily: 'monospace', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>HOW TO GET YOUR KEY (FREE IN 30 SECONDS)</span>
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.66rem', lineHeight: 1.6, color: '#333', fontFamily: 'monospace' }}>
                        {selectedProvider === 'gemini' ? (
                            <>
                                <li>
                                    Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#000' }}>Google AI Studio ↗</a> (signs in with your existing Google account).
                                </li>
                                <li>
                                    Click <strong>"Create API key"</strong> (free tier gives thousands of requests, no billing required).
                                </li>
                                <li>
                                    Copy the key (starts with <code>AIzaSy…</code>), paste it above and tap <strong>SAVE</strong>.
                                </li>
                            </>
                        ) : selectedProvider === 'groq' ? (
                            <>
                                <li>
                                    Open <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#000' }}>Groq Cloud Console ↗</a> and sign in.
                                </li>
                                <li>
                                    Click <strong>"Create API Key"</strong> and name it CreatorsKit.
                                </li>
                                <li>
                                    Copy key (starts with <code>gsk_…</code>), paste it above and tap <strong>SAVE</strong>.
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    Open <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#000' }}>OpenAI API Keys ↗</a>.
                                </li>
                                <li>
                                    Create a new secret key (starts with <code>sk-…</code>).
                                </li>
                                <li>
                                    Paste it above and tap <strong>SAVE</strong>.
                                </li>
                            </>
                        )}
                    </ol>
                </div>

                {/* Privacy Guarantee */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6rem', color: '#666', fontFamily: 'monospace' }}>
                    <ShieldCheck size={14} color="#16A34A" />
                    <span>Keys are stored strictly in your browser's local memory and sent directly to the AI provider.</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Reusable Trigger Button showing status of BYOK AI key & active model
 */
export function ByokButton({ onClick }: { onClick: () => void }) {
    const [hasKey, setHasKey] = useState(false);
    const [provider, setProvider] = useState<AiProvider>('gemini');
    const [model, setModel] = useState<string>('');

    const refresh = () => {
        const p = getActiveAiProvider();
        setProvider(p);
        setHasKey(hasStoredAiKey(p));
        setModel(getStoredAiModel(p));
    };

    useEffect(() => {
        refresh();
        window.addEventListener('ck_byok_updated', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener('ck_byok_updated', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    const shortModel = model
        .replace('gemini-', '')
        .replace('-versatile', '')
        .replace('-instant', '')
        .replace('-32768', '');

    const provLabel = AI_PROVIDERS[provider].label
        .replace('Google ', '')
        .replace(' Cloud', '')
        .toUpperCase();

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                border: '1.5px solid #000',
                background: hasKey ? '#00FF88' : '#FFE500',
                color: '#000',
                fontWeight: 900,
                fontSize: '0.52rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
                flexShrink: 0,
            }}
            title="Configure Bring-Your-Own-Key AI"
        >
            <Key size={10} />
            <span>{hasKey ? `${provLabel} [${shortModel.toUpperCase()}]` : 'SETUP AI KEY'}</span>
        </button>
    );
}
