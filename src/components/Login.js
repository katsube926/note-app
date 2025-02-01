import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebase'; // firebaseのインスタンスをインポート

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const auth = getAuth(app);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(isLogin 
        ? 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
        : '登録に失敗しました。別のメールアドレスを試してください。'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vscode-bg">
      <div className="bg-vscode-sidebar p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-vscode-text">
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-vscode-text text-sm mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded text-vscode-text focus:outline-none focus:border-[#3794ff]"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-vscode-text text-sm mb-2">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded text-vscode-text focus:outline-none focus:border-[#3794ff]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#3794ff] text-white py-2 px-4 rounded hover:bg-[#2d7ad1] transition-colors mb-4"
          >
            {isLogin ? 'ログイン' : '登録'}
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full bg-transparent text-[#3794ff] py-2 px-4 rounded hover:bg-[#1e1e1e] transition-colors"
          >
            {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login; 