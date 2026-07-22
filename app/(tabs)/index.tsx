import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  image: number;
};

const slides: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Welcome to RoadSync",
    description:
      "Keep every mile, moment, and member of your road trip in sync.",
    image: require("../../assets/images/welcome_image.png"),
  },
  {
    id: "create",
    title: "Create your road trip",
    description:
      "Set up your trip, add the route, and invite your crew in just a few steps.",
    image: require("../../assets/images/create_image.png"),
  },
  {
    id: "join",
    title: "Join your crew",
    description:
      "Use a trip code to join an existing journey and stay connected with everyone.",
    image: require("../../assets/images/join_image.png"),
  },
  {
    id: "navigate",
    title: "Navigate together",
    description:
      "Follow the shared route, keep track of stops, and make every mile smoother.",
    image: require("../../assets/images/navigate_image.png"),
  },
];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = width - 48;
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<FlatList<OnboardingSlide>>(null);

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
              <Image
                source={item.image}
                style={styles.imagePlaceholder}
                resizeMode="cover"
              />
            </View>
          )}
        />

        <View style={styles.copy}>
          <View
            style={styles.pagination}
            accessibilityLabel={`Slide ${activeIndex + 1} of ${slides.length}`}
          >
            {slides.map((slide, index) => (
              <Pressable
                key={slide.id}
                accessibilityRole="button"
                accessibilityLabel={`Go to ${slide.title}`}
                onPress={() => goToSlide(index)}
                style={[styles.dot, index === activeIndex && styles.activeDot]}
              />
            ))}
          </View>
          <Text style={styles.title}>{slides[activeIndex].title}</Text>
          <Text style={styles.description}>
            {slides[activeIndex].description}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get started"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
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
    marginHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  topBar: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    marginBottom: 12,
    marginTop: 12,
  },
  slide: {
    alignItems: "center",
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imagePlaceholder: {
    alignSelf: "center",
    borderRadius: 4,
    flex: 1,
    backgroundColor: "#d8d8d8",
    minHeight: 250,
    width: "100%",
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 18,
  },
  pagination: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 18,
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
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    color: "#e1ebe7",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 12,
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
