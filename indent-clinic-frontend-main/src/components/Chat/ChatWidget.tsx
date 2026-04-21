import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';
import { useChat } from '../../context/ChatContext';

const ChatWidget: React.FC = () => {
    const { isConnected, messages, sendMessage, senderName, activeUsers } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLen = useRef(messages.length);

    const playNotificationSound = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const playNote = (freq: number, start: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                
                gain.gain.setValueAtTime(0, ctx.currentTime + start);
                gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + start + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + duration);
            };

            // Professional "Ding" sound using two tones (A5 and C6)
            playNote(880, 0, 0.4);
            playNote(1046.5, 0.1, 0.5);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    useEffect(() => {
        if (messages.length > prevMessagesLen.current) {
            // New message arrived
            const lastMsg = messages[messages.length - 1];

            // Only count if it's not from me
            if (lastMsg.sender !== senderName) {
                const isGeneral = !lastMsg.to;
                const senderKey = isGeneral ? 'general' : lastMsg.sender;

                // Check if we are currently viewing this conversation
                const isViewingContext = isOpen && (
                    (isGeneral && selectedUser === null) ||
                    (!isGeneral && selectedUser === lastMsg.sender)
                );

                if (!isViewingContext) {
                    // Update internal map for specific badges
                    setUnreadMap(prev => ({
                        ...prev,
                        [senderKey]: (prev[senderKey] || 0) + 1
                    }));

                    // Update global badge only if chat is closed
                    if (!isOpen) {
                        setUnreadCount(prev => prev + 1);
                    }
                    
                    playNotificationSound();
                } else {
                    // Even if we are viewing the context, play a sound so we know a message arrived
                    playNotificationSound();
                }
            }
        }
        prevMessagesLen.current = messages.length;
    }, [messages, isOpen, senderName, selectedUser]);

    const toggleChat = () => {
        if (!isOpen) {
            setUnreadCount(0);
        }
        setIsOpen(!isOpen);
    };

    const handleSelectUser = (user: string | null) => {
        setSelectedUser(user);
        // Clear unread for this user immediately
        const key = user === null ? 'general' : user;
        if (unreadMap[key]) {
            setUnreadMap(prev => {
                const newMap = { ...prev };
                delete newMap[key];
                return newMap;
            });
        }
    };

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue, selectedUser || undefined);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Filter messages based on selection
    const filteredMessages = messages.filter(msg => {
        if (!selectedUser) {
            // General channel: show messages with no 'to' field
            return !msg.to;
        } else {
            // Private chat: show msg where (sender=me AND to=selected) OR (sender=selected AND to=me)
            return (msg.sender === senderName && msg.to === selectedUser) ||
                (msg.sender === selectedUser && msg.to === senderName);
        }
    });

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            // Also check if we need to clear current view's unread (e.g. if we just opened chat/switched view)
            const key = selectedUser === null ? 'general' : selectedUser;
            if (unreadMap[key]) {
                setUnreadMap(prev => {
                    const newMap = { ...prev };
                    delete newMap[key];
                    return newMap;
                });
            }
        }
    }, [filteredMessages, isOpen, selectedUser, unreadMap]);

    return (
        <div className="chat-widget-container">
            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <div className="chat-title">
                            <h3>Chat Clinica ({activeUsers.length})</h3>
                            <span className="chat-status">
                                <div className={`status-dot ${selectedUser ? 'private' : (isConnected ? '' : 'offline')}`}></div>
                                {selectedUser ? `Chat con ${selectedUser}` : (isConnected ? 'Canal General' : 'Desconectado')}
                            </span>
                        </div>
                        <button onClick={toggleChat} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>
                            ✖
                        </button>
                    </div>

                    <div style={{ padding: '10px', background: '#f0fdf4', fontSize: '12px', borderBottom: '1px solid #dcfce7', maxHeight: '80px', overflowY: 'auto' }}>
                        <div
                            style={{
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                backgroundColor: !selectedUser ? '#dcfce7' : 'transparent',
                                fontWeight: !selectedUser ? 'bold' : 'normal',
                                color: '#16a34a',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onClick={() => handleSelectUser(null)}
                        >
                            <span>📢 Canal General</span>
                            {unreadMap['general'] > 0 && (
                                <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
                                    {unreadMap['general']}
                                </span>
                            )}
                        </div>
                        {activeUsers.map(user => (
                            <div
                                key={user}
                                style={{
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    backgroundColor: selectedUser === user ? '#dcfce7' : 'transparent',
                                    fontWeight: selectedUser === user ? 'bold' : 'normal',
                                    color: '#15803d',
                                    marginTop: '2px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onClick={() => handleSelectUser(user)}
                            >
                                <span>👤 {user} {user === senderName ? '(Tú)' : ''}</span>
                                {unreadMap[user] > 0 && (
                                    <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
                                        {unreadMap[user]}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="chat-messages">
                        {filteredMessages.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px', fontSize: '14px' }}>
                                {selectedUser ? `Inicia una conversación privada con ${selectedUser}` : 'Bienvenido al chat general.'}
                            </div>
                        ) : (
                            filteredMessages.map((msg, index) => {
                                const isMe = msg.sender === senderName;
                                return (
                                    <div key={index} className={`message ${isMe ? 'sent' : 'received'}`}>
                                        <span className="message-sender">{isMe ? 'Tú' : msg.sender}</span>
                                        {msg.message}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder={selectedUser ? `Mensaje para ${selectedUser}...` : "Escribe a todos..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={!isConnected}
                        />
                        <button
                            className="chat-send-btn"
                            onClick={handleSend}
                            disabled={!isConnected || !inputValue.trim()}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            <button className="chat-toggle-btn" onClick={toggleChat}>
                💬
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
