import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true); // ログインと新規登録の切り替え用

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        // ログイン処理
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // 新規登録処理
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('認証エラー:', error);
      switch (error.code) {
        case 'auth/invalid-credential':
          setError('メールアドレスまたはパスワードが間違っています。');
          break;
        case 'auth/invalid-email':
          setError('メールアドレスの形式が正しくありません。');
          break;
        case 'auth/user-disabled':
          setError('このアカウントは無効になっています。');
          break;
        case 'auth/user-not-found':
          setError('アカウントが見つかりません。');
          break;
        case 'auth/wrong-password':
          setError('パスワードが間違っています。');
          break;
        case 'auth/email-already-in-use':
          setError('このメールアドレスは既に使用されています。');
          break;
        case 'auth/weak-password':
          setError('パスワードは6文字以上で設定してください。');
          break;
        default:
          setError('エラーが発生しました。もう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vscode-bg">
      <div className="bg-vscode-sidebar p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-vscode-text">
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="w-full p-2 rounded bg-vscode-bg text-vscode-text border border-vscode-border"
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full p-2 rounded bg-vscode-bg text-vscode-text border border-vscode-border"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#3794ff] text-white p-2 rounded hover:bg-[#2d7ad1] disabled:opacity-50"
          >
            {isLoading ? '処理中...' : (isLogin ? 'ログイン' : '新規登録')}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#3794ff] hover:text-[#2d7ad1] text-sm"
          >
            {isLogin 
              ? 'アカウントをお持ちでない方はこちら' 
              : '既にアカウントをお持ちの方はこちら'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login; 