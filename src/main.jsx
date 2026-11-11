import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UiProvider } from './ui.jsx';
import { sessionGt2, bounceToPortal, clearBounceFlag } from './services/session';
import './index.css';

/**
 * Chưa đăng nhập thì về cổng VHKD (GT2 không có form đăng nhập riêng) — quyết định TRƯỚC khi React vẽ.
 * bounceToPortal() trả false ở nơi không có cổng (localhost) hoặc vừa bị đá về mà quay lại tay không: lúc đó App tự hiện màn "Cần đăng nhập".
 */
const signedIn = !!sessionGt2();
if (signedIn) clearBounceFlag();

class Khung extends React.Component {
  constructor(p) { super(p); this.state = { loi: null }; }
  static getDerivedStateFromError(e) { return { loi: e }; }
  render() {
    return this.state.loi
      ? <main><div className="notice err">Giao diện gặp lỗi: {String(this.state.loi.message || this.state.loi)}. Tải lại trang; nếu vẫn lỗi, báo quản trị.</div></main>
      : this.props.children;
  }
}

if (signedIn || !bounceToPortal()) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode><Khung><UiProvider><App /></UiProvider></Khung></React.StrictMode>
  );
}
