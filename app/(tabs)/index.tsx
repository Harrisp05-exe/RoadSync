import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  image: number;
  aspectRatio: number;
};

const slides: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Welcome to RoadSync",
    description:
      "Keep every mile, moment, and member of your road trip in sync.",
    image: require("../../assets/images/welcome_image.jpeg"),
    aspectRatio: 1290 / 2476,
  },
  {
    id: "create",
    title: "Create your road trip",
    description:
      "Set up your trip, add the route, and invite your crew in just a few steps.",
    image: require("../../assets/images/create_image.jpeg"),
    aspectRatio: 1290 / 2163,
  },
  {
    id: "join",
    title: "Join your crew",
    description:
      "Use a trip code to join an existing journey and stay connected with everyone.",
    image: require("../../assets/images/join_image.jpeg"),
    aspectRatio: 1290 / 2457,
  },
  {
    id: "navigate",
    title: "Navigate together",
    description:
      "Follow the shared route, keep track of stops, and make every mile smoother.",
    image: require("../../assets/images/navigate_image.jpeg"),
    aspectRatio: 1290 / 2796,
  },
];

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const contentWidth = width - 40;
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<FlatList<OnboardingSlide>>(null);
  const imageFade = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeIndex, imageFade, textFade]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / contentWidth,
    );
    const boundedIndex = Math.min(Math.max(nextIndex, 0), slides.length - 1);

    setActiveIndex((currentIndex) =>
      currentIndex === boundedIndex ? currentIndex : boundedIndex,
    );
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    carouselRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#e8c7f2", "#102d63"]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>RoadSync</Text>
        </View>

        <FlatList
          ref={carouselRef}
          data={slides}
          horizontal
          pagingEnabled
          style={styles.carousel}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(slide) => slide.id}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: contentWidth }]}>
              <View
                style={[
                  styles.mockupFrame,
                  {
                    aspectRatio: item.aspectRatio,
                    maxHeight: Math.min(height * 0.48, 420),
                  },
                ]}
              >
                <View style={styles.mockupInner}>
                  <Animated.Image
                    source={item.image}
                    style={[
                      styles.mockupImage,
                      {
                        opacity: imageFade,
                        transform: [
                          {
                            translateY: imageFade.interpolate({
                              inputRange: [0, 1],
                              outputRange: [14, 0],
                            }),
                          },
                          {
                            scale: imageFade.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.97, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>
          )}
        />

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: textFade,
              transform: [
                {
                  translateY: textFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={styles.pagination}
            accessibilityLabel={"Slide " + (activeIndex + 1) + " of " + slides.length}
          >
            {slides.map((slide, index) => (
              <Pressable
                key={slide.id}
                accessibilityRole="button"
                accessibilityLabel={"Go to " + slide.title}
                onPress={() => goToSlide(index)}
                style={[styles.dot, index === activeIndex && styles.activeDot]}
              />
            ))}
          </View>
          <Text style={styles.title}>{slides[activeIndex].title}</Text>
          <Text style={styles.description}>
            {slides[activeIndex].description}
          </Text>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            onPress={() => router.replace("/auth")}
            onPressIn={() => {
              Animated.spring(buttonScale, {
                toValue: 0.98,
                friction: 7,
                tension: 180,
                useNativeDriver: true,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(buttonScale, {
                toValue: 1,
                friction: 7,
                tension: 180,
                useNativeDriver: true,
              }).start();
            }}
            style={({ pressed }) => [
              styles.button,
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#202021",
  },
  container: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: "hidden",
    paddingTop: 8,
    paddingBottom: 20,
  },
  topBar: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 16,
    paddingBottom: 4,
    position: "relative",
  },
  brand: {
    color: "#f9f6f0",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  carousel: {
    flex: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  mockupFrame: {
    height: "100%",
    borderRadius: 26,
    backgroundColor: "#ffffff",
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "#051026",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  mockupInner: {
    flex: 1,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  mockupImage: {
    width: "100%",
    height: "100%",
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  pagination: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9eb3ae",
  },
  activeDot: {
    width: 22,
    backgroundColor: "#ffffff",
  },
  title: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    color: "#e1ebe7",
    fontSize: 14,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 290,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#050505",
    borderRadius: 24,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 30,
    width: "68%",
  },
  pressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },
});
