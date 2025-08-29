import React, { useState, useEffect } from "react";

function OTPVerification({
    phoneNumber,
    onVerifyOTP,
    onResendOTP,
    onBack,
    loading,
    confirmationResult
}) {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (timer > 0) {
            const interval = setTimeout(() => setTimer(timer - 1), 1000);
            return () => clearTimeout(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    const handleOtpChange = (value, index) => {
        if (value.length <= 1) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Auto-focus next input
            if (value && index < 5) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                if (nextInput) nextInput.focus();
            }
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleVerify = (e) => {
        e.preventDefault();
        const otpCode = otp.join("");
        if (otpCode.length === 6) {
            onVerifyOTP(confirmationResult, otpCode);
        }
    };

    const handleResend = () => {
        setTimer(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        onResendOTP();
    };

    return (
        <div className="otp-verification-container text-center">
            <div className="mb-3">
                <i className="fas fa-mobile-alt fa-3x text-primary mb-3"></i>
                <h3 className="mb-3">Verify Phone Number</h3>
                <p className="mb-4">
                    We've sent a 6-digit OTP to<br />
                    <strong style={{ color: "#3e5eb0ff" }}>{phoneNumber}</strong>
                </p>
            </div>

            <form onSubmit={handleVerify}>
                <div className="otp-inputs d-flex justify-content-center mb-4">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            className="otp-box mx-1"
                            value={digit}
                            onChange={(e) => handleOtpChange(e.target.value, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            maxLength="1"
                            pattern="[0-9]"
                            inputMode="numeric"
                        />
                    ))}
                </div>

                {/* <div className="mb-3">
                    {timer > 0 ? (
                        <p className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            Resend OTP in <span id="timer" className="fw-bold text-primary">{timer}</span> seconds
                        </p>
                    ) : (
                        <button
                            type="button"
                            className="btn regBtn btn-link  anc-link"
                            onClick={handleResend}
                            disabled={loading}
                        >
                            <i className="fas fa-redo me-1"></i>
                            {loading ? 'Sending...' : 'Resend OTP'}
                            <span>Resend</span>
                        </button>
                    )}
                </div> */}

                <div className="d-flex justify-content-center gap-3">
                    <button
                        type="button"
                        className="btn neon-button2"
                        onClick={onBack}
                        disabled={loading}
                    >
                        <i className="fas fa-arrow-left me-1"></i>
                        Back
                    </button>
                    <button
                        type="submit"
                        className="btn neon-button2"
                        disabled={loading || otp.join("").length !== 6}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin me-1"></i>
                                Verifying...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check me-1"></i>
                                Verify
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default OTPVerification;
