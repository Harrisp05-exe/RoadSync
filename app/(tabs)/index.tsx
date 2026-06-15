import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🚗</Text>

      <Text style={styles.title}>RoadSync</Text>

      <Text style={styles.subtitle}>Travel together. Stay together.</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Create Trip</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Join Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  logo: {
    fontSize: 70,
    marginBottom: 20,
  },

  title: {
    fontSize: 36,
    fontWeight: "bold",
  },

  subtitle: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 40,
    textAlign: "center",
    color: "aqua",
  },

  button: {
    width: 220,
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
});
