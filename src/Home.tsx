import CountryBudget from "./CountryBudget";
import Brand from "./Brand";
import { lazy, Suspense } from "react";
import AppShowcase from "./AppShowcase";
import { motion, useReducedMotion } from "motion/react";
const StudyGlobe = lazy(() => import("./StudyGlobe"));
import {
  ArrowRight,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Globe2,
} from "lucide-react";
import { Button } from "./components/ui/button";
import "./home.css";

export default function Home() {
  const reduced = useReducedMotion();
  return (
    <div className="public-home">
      <a className="home-skip" href="#home-content">
        Skip to content
      </a>
      <header className="home-header">
        <Brand href="#home" />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#login">Sign in</a>
          <Button asChild>
            <a href="#register">
              Create account <ArrowRight size={16} />
            </a>
          </Button>
        </nav>
      </header>
      <main id="home-content">
        <section className="home-hero">
          <motion.div
            className="home-intro"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: reduced ? 0 : 0.1,
                  delayChildren: 0.1,
                },
              },
            }}
          >
            <h1>
              <span className="hero-line">
                <motion.span
                  variants={{
                    hidden: { y: reduced ? 0 : "110%" },
                    show: {
                      y: 0,
                      transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  Plan your
                </motion.span>
              </span>{" "}
              <span className="hero-line hero-line-secondary">
                <motion.span
                  variants={{
                    hidden: { y: reduced ? 0 : "110%" },
                    show: {
                      y: 0,
                      transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  study finances.
                </motion.span>
              </span>
            </h1>
            <p className="home-description">
              Track tuition, living costs and sponsor support.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <a href="#register-student">
                  Create account <ArrowRight size={18} />
                </a>
              </Button>
            </div>
          </motion.div>
          <motion.div
            className="home-visual"
            initial={reduced ? false : { opacity: 0, scale: 0.86, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<div className="study-globe" />}>
              <StudyGlobe />
            </Suspense>
          </motion.div>
          <button
            type="button"
            className="hero-scroll-cue"
            aria-label="Scroll to app preview"
            onClick={() =>
              document.getElementById("how-it-works")?.scrollIntoView({
                behavior: reduced ? "instant" : "smooth",
                block: "start",
              })
            }
          >
            <span>Scroll to explore</span>
            <motion.svg
              className="hero-scroll-chevron"
              width="16"
              height="18"
              viewBox="0 0 16 18"
              fill="none"
              aria-hidden="true"
              animate={reduced ? {} : { y: [0, 3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <path
                d="M8 2v13m-5-5 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </button>
        </section>
        <section
          id="how-it-works"
          className="home-showcase-section"
          aria-label="Interactive app preview"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7 }}
          >
            <AppShowcase />
          </motion.div>
        </section>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <CountryBudget />
        </motion.div>
        <section className="home-accounts" aria-labelledby="account-options">
          <h2 id="account-options">Ready for your next chapter?</h2>
          <div className="home-account-actions">
            <a href="#register-student">
              <GraduationCap size={22} />
              <span>Create student account</span>
              <ArrowRight size={18} />
            </a>
            <a href="#register-sponsor">
              <HeartHandshake size={22} />
              <span>Create sponsor account</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <span>Financial Passport</span>
        <p>
          Planning tools for your studies abroad. Payments currently use a
          sandbox.
        </p>
        <a href="#login">
          Sign in <ArrowRight size={15} />
        </a>
      </footer>
    </div>
  );
}
