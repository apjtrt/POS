import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Lock, Camera, ArrowRight } from 'lucide-react';

const Login = () => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleNext = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setStep(2);
    startCamera();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast.error('Camera access is required for secure login.');
      setStep(1);
    }
  };

  const handleCaptureAndLogin = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Draw current video frame to canvas
    const context = canvasRef.current.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, 320, 240);

    // Compress heavily to keep database light (JPEG 0.5 quality)
    const photoBase64 = canvasRef.current.toDataURL('image/jpeg', 0.5);

    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setLoading(true);

    // Get location
    const getPosition = () => new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
      );
    });

    const coords = await getPosition();

    try {
      await login(username, password, photoBase64, coords?.lat || null, coords?.lng || null);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      setStep(1); // Go back if login fails
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 saas-card p-8 md:p-10 z-10">
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            {step === 1 ? <Lock className="h-6 w-6 text-primary-600 dark:text-primary-300" /> : <Camera className="h-6 w-6 text-primary-600 dark:text-primary-300" />}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
            {step === 1 ? 'Admin Login' : 'Secure Verification'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Dr. A.P.J. Abdul Kalam Youth Welfare Association Tiruttani
            Created by MANOJ P | <a href="https://pmjprojects.vercel.app" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">PMJ Projects</a>
          </p>
        </div>

        {step === 1 && (
          <form className="mt-8 space-y-6" onSubmit={handleNext}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label className="sr-only">Username</label>
                <input
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-primary-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="sr-only">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-primary-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4 mt-0.5" />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-6">
            <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-video flex items-center justify-center border border-slate-300 dark:border-slate-600">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
              ></video>
              <canvas ref={canvasRef} width="320" height="240" className="hidden" />
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Please align your face in the camera. A photo will be securely logged with this session.
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  if (stream) stream.getTracks().forEach(track => track.stop());
                  setStep(1);
                }}
                className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 saas-card hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCaptureAndLogin}
                disabled={loading}
                className="flex-[2] flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <Camera className="mr-2 h-4 w-4" /> Capture & Login
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
