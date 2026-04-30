import React, { useState } from "react";
import "./style.css";
import logo from "../../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validate } from "../utils/validate";
import { userLogin } from "../store/loginSlice";

interface FormState {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [formData, setFormData] = useState<FormState>({
    username: "",
    password: "",
  });

  const [loader, setLoader] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fields = [
      { name: "username", validate: "required", label: "User Name" },
      { name: "password", validate: "required", label: "Password" },
    ];

    const result = await validate(fields, formData);

    if (result !== true) {
      setMessage(Object.values(result).join(", "));
      return;
    }

    try {
      setLoader(true);
      const res: any = await dispatch(userLogin(formData) as any);
      setLoader(false);

      if (res.payload?.token) {
        toast.success("Login Successful!", { autoClose: 1000 });

        // optional role based navigation
        const type = localStorage.getItem("userTY");
        if (type === "CUSTOMER") {
          navigate("/dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        setMessage(res.payload || "Invalid username or password");
        toast.error(res.payload || "Login failed", { autoClose: 1000 });
      }
    } catch {
      setLoader(false);
      toast.error("Something went wrong!", { autoClose: 1000 });
    }
  };

  return (
    <div className="login-background">
      <div className="login-card">
        <img src={logo} alt="TrucPro" className="login-logo" />

        <form onSubmit={handleSubmit} className="login-form">
          {message && <p className="error-message">{message}</p>}

          <input
            type="text"
            name="username"
            placeholder="User name"
            value={formData.username}
            onChange={handleChange}
            className="input-field"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="input-field"
          />

          <button type="submit" className="btn-login" disabled={loader}>
            {loader ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
