import React, {
  useEffect,
  useRef,
  useState,
} from "react";

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
} from "lucide-react";

import Footer from "../components/Footer";
import AppShell from "../components/Dashboard/AppShell";

import api from "../api/axios";
import { useAuth } from "../Context/AuthContext";

import Avatar from "../assets/Images/defaultavatar.png";

const Profile = () => {
  const {
    user: authUser,
    updateUser,
  } = useAuth();

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [editMode, setEditMode] = useState(false);

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    weight: "",
  });

  // ==========================================
  // FETCH PROFILE
  // ==========================================

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/api/profile"
      );

      console.log(
        "PROFILE RESPONSE:",
        response.data
      );

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
      console.error(
        "PROFILE FETCH ERROR:",
        error
      );

      if (error.response) {
        console.error(
          "Status:",
          error.response.status
        );

        console.error(
          "Backend response:",
          error.response.data
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // PROFILE IMAGE CLICK
  // ==========================================

  const handleImageClick = () => {
    if (uploadingImage) return;

    fileInputRef.current?.click();
  };

  // ==========================================
  // PROFILE IMAGE UPLOAD
  // ==========================================

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select an image file."
      );

      e.target.value = "";

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Image size must be less than 5 MB."
      );

      e.target.value = "";

      return;
    }

    try {
      setUploadingImage(true);

      const imageFormData = new FormData();

      imageFormData.append(
        "profileImage",
        file
      );

      console.log(
        "Uploading profile image..."
      );

      // IMPORTANT:
      // Backend route is:
      // POST /api/profile/image

      const response = await api.post(
        "/api/profile/image",
        imageFormData
      );

      console.log(
        "IMAGE UPLOAD RESPONSE:",
        response.data
      );

      if (response.data.success) {
        const updatedUser =
          response.data.user;

        setUser(updatedUser);

        setFormData({
          fullName:
            updatedUser.fullName || "",
          age:
            updatedUser.age ?? "",
          gender:
            updatedUser.gender || "",
          weight:
            updatedUser.weight ?? "",
        });

        if (updateUser) {
          updateUser(updatedUser);
        }

        console.log(
          "Profile image updated:",
          updatedUser.profileImage
        );
      }
    } catch (error) {
      console.error(
        "PROFILE IMAGE UPLOAD ERROR:",
        error
      );

      if (error.response) {
        console.error(
          "Status:",
          error.response.status
        );

        console.error(
          "Backend response:",
          error.response.data
        );

        alert(
          error.response.data?.message ||
            "Failed to upload profile image."
        );
      } else {
        alert(
          "Failed to upload profile image."
        );
      }
    } finally {
      setUploadingImage(false);

      e.target.value = "";
    }
  };

  // ==========================================
  // EDIT PROFILE
  // ==========================================

  const handleEdit = () => {
    setEditMode(true);
  };

  // ==========================================
  // CANCEL
  // ==========================================

  const handleCancel = () => {
    setEditMode(false);

    setFormData({
      fullName: user?.fullName || "",
      age: user?.age ?? "",
      gender: user?.gender || "",
      weight: user?.weight ?? "",
    });
  };

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await api.put(
        "/api/profile",
        {
          fullName: formData.fullName,
          age: Number(formData.age),
          gender: formData.gender,
          weight: Number(formData.weight),
        }
      );

      console.log(
        "PROFILE UPDATE RESPONSE:",
        response.data
      );

      if (response.data.success) {
        const updatedUser =
          response.data.user;

        setUser(updatedUser);

        setFormData({
          fullName:
            updatedUser.fullName || "",
          age:
            updatedUser.age ?? "",
          gender:
            updatedUser.gender || "",
          weight:
            updatedUser.weight ?? "",
        });

        if (updateUser) {
          updateUser(updatedUser);
        }

        setEditMode(false);
      }
    } catch (error) {
      console.error(
        "PROFILE UPDATE ERROR:",
        error
      );

      if (error.response) {
        console.error(
          "Status:",
          error.response.status
        );

        console.error(
          "Backend response:",
          error.response.data
        );

        alert(
          error.response.data?.message ||
            "Failed to update profile."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <AppShell footer={<Footer />}>
        <div className="flex min-h-[70vh] items-center justify-center text-white">
          Loading profile...
        </div>
      </AppShell>
    );
  }

  // ==========================================
  // PROFILE NOT FOUND
  // ==========================================

  if (!user) {
    return (
      <AppShell footer={<Footer />}>
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-red-400">
          <p>
            Unable to load profile.
          </p>

          <button
            onClick={fetchProfile}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  // ==========================================
  // PROFILE IMAGE
  // ==========================================

  const profileImage =
    user.profileImage ||
    authUser?.profileImage ||
    Avatar;

  // ==========================================
  // UI
  // ==========================================

  return (
    <AppShell footer={<Footer />}>
      <div className="space-y-5">

        {/* PROFILE HEADER */}

        <section
          className="
            flex flex-col gap-6
            rounded-2xl
            border border-violet-400/20
            bg-[#2A194F]/75
            p-5
            sm:flex-row
            sm:items-center
            sm:p-7
          "
        >
          {/* PROFILE IMAGE */}

          <div className="relative shrink-0">

            <button
              type="button"
              onClick={handleImageClick}
              disabled={uploadingImage}
              className="
                group
                relative
                block
                size-28
                overflow-hidden
                rounded-full
                border-2
                border-purple-500
                sm:size-36
              "
            >
                  <img
          src={profileImage}
          alt="Profile"
          className="
            size-full
            object-cover
            transition
            duration-300
            group-hover:scale-105
            group-hover:brightness-75
          "
        />

              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  bg-black/40
                  opacity-0
                  transition
                  duration-300
                  group-hover:opacity-100
                "
              >
                {uploadingImage ? (
                  <div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Camera
                    size={28}
                    className="text-white"
                  />
                )}
              </div>
            </button>

            <div
              className="
                pointer-events-none
                absolute
                bottom-0
                right-0
                grid
                size-9
                place-items-center
                rounded-full
                border-2
                border-[#2A194F]
                bg-violet-600
                text-white
              "
            >
              <Camera size={16} />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* PROFILE DETAILS */}

          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              {user.fullName}
            </h1>

            <p className="mt-2 text-sm text-white/65">
              {user.email}
            </p>

            <p className="mt-5 text-white/85">
              Stay consistent and strong — you've got this. 💪
            </p>

            <p className="mt-2 text-xs text-white/40">
              Click your profile picture to change it
            </p>
          </div>
        </section>

        {/* PERSONAL INFORMATION */}

        <section
          className="
            rounded-2xl
            border border-violet-400/20
            bg-[#2A194F]/75
            p-5
            sm:p-7
          "
        >
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
              border-b
              border-white/20
              pb-4
            "
          >
            <h2 className="text-lg font-bold">
              Personal information
            </h2>

            {!editMode ? (
              <button
                onClick={handleEdit}
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-2
                  text-sm
                  font-semibold
                  text-violet-300
                  transition
                  hover:text-violet-200
                "
              >
                <Pencil size={16} />
                Edit profile
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-2
                  text-sm
                  font-semibold
                  text-red-400
                  transition
                  hover:text-red-300
                "
              >
                <X size={16} />
                Cancel
              </button>
            )}
          </div>

          {/* FULL NAME */}

          <ProfileRow
            icon={UserRound}
            label="Full name"
          >
            {editMode ? (
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="
                  w-full
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-white
                  outline-none
                  focus:border-violet-500
                  sm:w-72
                "
              />
            ) : (
              user.fullName
            )}
          </ProfileRow>

          {/* EMAIL */}

          <ProfileRow
            icon={Mail}
            label="Email"
          >
            {user.email}
          </ProfileRow>

          {/* AGE */}

          <ProfileRow
            icon={CalendarDays}
            label="Age"
          >
            {editMode ? (
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="
                  w-full
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-white
                  outline-none
                  focus:border-violet-500
                  sm:w-72
                "
              />
            ) : (
              `${user.age} years`
            )}
          </ProfileRow>

          {/* GENDER */}

          <ProfileRow
            icon={VenusAndMars}
            label="Gender"
          >
            {editMode ? (
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="
                  w-full
                  rounded-lg
                  border
                  border-white/10
                  bg-[#171020]
                  px-3
                  py-2
                  text-white
                  outline-none
                  focus:border-violet-500
                  sm:w-72
                "
              >
                <option value="MALE">
                  Male
                </option>

                <option value="FEMALE">
                  Female
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            ) : (
              user.gender
            )}
          </ProfileRow>

          {/* WEIGHT */}

          <ProfileRow
            icon={Weight}
            label="Weight"
          >
            {editMode ? (
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="
                  w-full
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  text-white
                  outline-none
                  focus:border-violet-500
                  sm:w-72
                "
              />
            ) : (
              `${user.weight} kg`
            )}
          </ProfileRow>

          {/* SAVE */}

          {editMode && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-violet-600
                  to-purple-600
                  px-6
                  py-3
                  font-semibold
                  text-white
                  transition
                  duration-300
                  hover:scale-105
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

// ==========================================
// PROFILE ROW
// ==========================================

const ProfileRow = ({
  icon: Icon,
  label,
  children,
}) => {
  return (
    <div
      className="
        flex
        flex-col
        gap-2
        border-b
        border-white/15
        py-4
        last:border-0
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      <span className="flex items-center gap-2 font-medium">
        <Icon size={18} />
        {label}
      </span>

      <span className="break-all text-sm text-white/70 sm:text-base">
        {children}
      </span>
    </div>
  );
};

export default Profile;