import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEYS = {
  email: "roadsync.user.email",
  username: "roadsync.user.username",
  profileImage: "roadsync.user.profileImage",
};

export default function ProfileScreen() {
  const [username, setUsername] = useState("Maya Smith");
  const [draftUsername, setDraftUsername] = useState("Maya Smith");
  const [registeredEmail, setRegisteredEmail] = useState("No email registered");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const saveToastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showSavedToast) {
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(saveToastAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(saveToastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      setShowSavedToast(false);
    });

    return () => {
      animation.stop();
    };
  }, [showSavedToast, saveToastAnim]);

  useEffect(() => {
    const loadProfile = async () => {
      const [savedEmail, savedUsername, savedImage] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.email),
        AsyncStorage.getItem(STORAGE_KEYS.username),
        AsyncStorage.getItem(STORAGE_KEYS.profileImage),
      ]);

      if (savedEmail) {
        setRegisteredEmail(savedEmail);
      }

      if (savedUsername) {
        setUsername(savedUsername);
        setDraftUsername(savedUsername);
      }

      if (savedImage) {
        setProfileImage(savedImage);
      }
    };

    loadProfile();
  }, []);

  const handleChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const nextUri = result.assets[0].uri;
      setProfileImage(nextUri);
      await AsyncStorage.setItem(STORAGE_KEYS.profileImage, nextUri);
    }
  };

  const handleUsernameChange = (nextUsername: string) => {
    setDraftUsername(nextUsername);
  };

  const handleSaveUsername = async () => {
    const trimmedUsername = draftUsername.trim();
    const nextUsername = trimmedUsername || "Maya Smith";

    setUsername(nextUsername);
    setDraftUsername(nextUsername);
    await AsyncStorage.setItem(STORAGE_KEYS.username, nextUsername);
    setShowSavedToast(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.email,
      STORAGE_KEYS.username,
      STORAGE_KEYS.profileImage,
    ]);
    router.replace("/auth");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {showSavedToast ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: saveToastAnim,
                transform: [
                  {
                    translateY: saveToastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.toastText}>Changes saved</Text>
          </Animated.View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Profile</Text>
          <Text style={styles.title}>Your account</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarFrame}>
            <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : require("../assets/images/welcome_image.png")
              }
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleChoosePhoto}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.photoButtonText}>Add profile photo</Text>
          </Pressable>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={draftUsername}
            onChangeText={handleUsernameChange}
            placeholder="Enter your username"
            placeholderTextColor="#8997b1"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleSaveUsername}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveButtonText}>Save changes</Text>
          </Pressable>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Registered email</Text>
          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{registeredEmail}</Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#edf2fb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 30,
    backgroundColor: "#edf2fb",
    position: "relative",
  },
  header: {
    marginBottom: 22,
  },
  eyebrow: {
    color: "#5d6d8d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#102d63",
    fontSize: 30,
    fontWeight: "900",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#dfe7ff",
    backgroundColor: "#dfe7ff",
    marginBottom: 16,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  photoButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 18,
    backgroundColor: "#f3f6ff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 14,
  },
  photoButtonText: {
    color: "#102d63",
    fontSize: 14,
    fontWeight: "700",
  },
  formSection: {
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    backgroundColor: "#102d63",
    borderRadius: 14,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  label: {
    color: "#3b4d73",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    color: "#102d63",
    fontSize: 15,
  },
  emailBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  emailText: {
    color: "#102d63",
    fontSize: 15,
    fontWeight: "700",
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#102d63",
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 12,
    backgroundColor: "#102d63",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#102d63",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    zIndex: 10,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.82,
  },
});
