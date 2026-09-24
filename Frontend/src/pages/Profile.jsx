import React, { useEffect, useRef, useState } from "react";
import {
  UserRound,
  CalendarDays,
  Mail,
  VenusAndMars,
  Weight,
  Pencil,
  X,
  Save,
  Camera,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";
import api from "../api/axios";
import { useAuth } from "../Context/AuthContext";
import Avatar from "../assets/Images/defaultavatar.png";

const Profile = () => {
  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    weight: "",
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/profile");
      if (response.data.success) {
        const profile = response.data.user;
        setUser(profile);
        setFormData({
          fullName: profile.fullName || "",
          age: profile.age ?? "",
          gender: profile.gender || "",
          weight: profile.weight ?? "",
        });
        if (updateUser) {
          updateUser(profile);
        }
      }
    } catch (error) {
      console.error("PROFILE FETCH ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageClick = () => {
    if (uploadingImage) return;
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    try {
      setUploadingImage(true);
      const imageFormData = new FormData();
      imageFormData.append("profileImage", file);

      const response = await api.post("/api/profile/image", imageFormData);

      if (response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        setFormData({
          fullName: updatedUser.fullName || "",
          age: updatedUser.age ?? "",
          gender: updatedUser.gender || "",
          weight: updatedUser.weight ?? "",
        });
        if (updateUser) {
          updateUser(updatedUser);
        }
      }
    } catch (error) {
      console.error("PROFILE IMAGE UPLOAD ERROR:", error);
      alert(error.response?.data?.message || "Failed to upload profile image.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      fullName: user?.fullName || "",
      age: user?.age ?? "",
      gender: user?.gender || "",
      weight: user?.weight ?? "",
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put("/api/profile", {
        fullName: formData.fullName,
        age: Number(formData.age),
        gender: formData.gender,
        weight: Number(formData.weight),
      });

      if (response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        setFormData({
          fullName: updatedUser.fullName || "",
          age: updatedUser.age ?? "",
          gender: updatedUser.gender || "",
          weight: updatedUser.weight ?? "",
        });
        if (updateUser) {
          updateUser(updatedUser);
        }
        setEditMode(false);
      }
    } catch (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      alert(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell footer={<Footer />}>
        <div className="flex min-h-[60vh] items-center justify-center text-slate-500 text-sm">
          Loading profile settings...
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell footer={<Footer />}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600">
          <p className="text-rose-600 font-medium text-sm">Unable to load profile.</p>
          <button
            onClick={fetchProfile}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </AppShell>
    );
  }

  const profileImage = user.profileImage || authUser?.profileImage || Avatar;

  return (
    <AppShell footer={<Footer />}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Profile Header Banner */}
        <section className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:p-8">
          {/* Avatar with Camera Overlay */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleImageClick}
              disabled={uploadingImage}
              className="group relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-indigo-100 bg-indigo-50 shadow-sm transition hover:scale-105 hover:border-indigo-400 sm:h-32 sm:w-32"
            >
              <img
                src={profileImage}
                alt="Profile"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition group-hover:opacity-100">
                <Camera size={24} className="text-white" />
              </div>
            </button>

            <div className="pointer-events-none absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md border-2 border-white">
              <Camera size={14} />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* User Summary Info */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900">
                {user.fullName}
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Athlete
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500 truncate">{user.email}</p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 sm:justify-start">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck size={14} />
                Biometrics Active
              </span>
              <span className="text-slate-400">Click photo to update avatar</span>
            </div>
          </div>
        </section>

        {/* Personal Metrics Form Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Personal Biometrics & Details
              </h2>
              <p className="text-xs text-slate-500">
                Used to personalize workout cadence and range-of-motion parameters
              </p>
            </div>

            {!editMode ? (
              <button
                onClick={handleEdit}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Pencil size={14} />
                <span>Edit Details</span>
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {/* Full Name */}
            <ProfileRow icon={UserRound} label="Full Name">
              {editMode ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white sm:w-80"
                />
              ) : (
                <span className="font-semibold text-slate-900">{user.fullName}</span>
              )}
            </ProfileRow>

            {/* Email */}
            <ProfileRow icon={Mail} label="Email Address">
              <span className="text-slate-600 font-mono text-xs">{user.email}</span>
            </ProfileRow>

            {/* Age */}
            <ProfileRow icon={CalendarDays} label="Age">
              {editMode ? (
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white sm:w-80"
                />
              ) : (
                <span className="font-semibold text-slate-900">{user.age} years</span>
              )}
            </ProfileRow>

            {/* Gender */}
            <ProfileRow icon={VenusAndMars} label="Gender">
              {editMode ? (
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white sm:w-80"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              ) : (
                <span className="font-semibold text-slate-900 capitalize">{user.gender || "Not specified"}</span>
              )}
            </ProfileRow>

            {/* Weight */}
            <ProfileRow icon={Weight} label="Weight (kg)">
              {editMode ? (
                <input
                  type="number"
                  name="weight"
                  step="0.5"
                  value={formData.weight}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white sm:w-80"
                />
              ) : (
                <span className="font-semibold text-slate-900">{user.weight} kg</span>
              )}
            </ProfileRow>
          </div>

          {/* Save Changes Button */}
          {editMode && (
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

const ProfileRow = ({ icon: Icon, label, children }) => {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
        {Icon && <Icon size={16} className="text-slate-400" />}
        <span>{label}</span>
      </div>

      <div className="text-sm">{children}</div>
    </div>
  );
};

export default Profile;