// Build: typst compile --pdf-standard a-2b docs/source/demonstration-guide.typ docs/demonstration-guide.pdf
#set document(title: "MoveWire — Visual Quick Start", author: "MoveWire", description: "A short payment walkthrough and visual tour of the main Student and Sponsor pages.")
#set text(font: "Noto Sans", size: 11pt, fill: rgb("18232d"), lang: "en")
#set par(leading: 0.5em, spacing: 0.7em)
#set page(paper: "a4", margin: (x: 17mm, top: 16mm, bottom: 17mm),
  header: text(size: 9pt, fill: rgb("57636e"))[MoveWire · Follow the numbered arrows],
  footer: context [#text(size: 9pt, fill: rgb("57636e"))[Demo only · No real money moves] #h(1fr) #text(size: 9pt)[#counter(page).display() / #counter(page).final().first()]],
)
#show heading.where(level: 1): set text(size: 24pt, weight: "bold")
#let blue = rgb("1767b5")
#let badge(n) = circle(radius: 3.1mm, fill: blue, stroke: none)[
  #align(center + horizon)[#text(fill: white, size: 10pt, weight: "bold")[#n]]
]
#let instruction(n, body) = block(above: 2mm, below: 3mm)[
  #grid(columns: (7mm, 1fr), gutter: 2mm, align: horizon, badge(n), body)
]
// Annotations are vector shapes over unmodified screenshots.
// Each mark: step number, short label, target rectangle in source pixels.
#let annotated(key, source-w, source-h, width, marks) = {
  let scale = width / source-w
  let image-x = 43mm
  let height = source-h * scale
  align(center)[
    #block(width: image-x + width + 3mm, height: height + 4mm, breakable: false)[
      #place(top + left, dx: image-x, dy: 1mm)[
        #image("guide-assets/" + key + ".png", width: width, alt: "MoveWire: " + key)
      ]
      #for (n, label, x, y, w, h) in marks {
        let tx = image-x + x * scale
        let ty = 1mm + y * scale
        let mid = ty + h * scale / 2
        place(top + left, dx: tx - 0.6mm, dy: ty - 0.6mm)[
          #rect(width: w * scale + 1.2mm, height: h * scale + 1.2mm, radius: 1mm, fill: none, stroke: blue + 1.2pt)
        ]
        place(top + left, dx: 0mm, dy: mid - 3.1mm)[#badge(n)]
        place(top + left, dx: 8mm, dy: mid - 3mm)[
          #block(width: 25mm)[#text(size: 10pt, weight: "bold", fill: blue)[#label]]
        ]
        place(top + left)[
          #line(start: (34mm, mid), end: (tx - 1mm, mid), stroke: blue + 1.2pt)
        ]
        place(top + left, dx: tx - 3mm, dy: mid - 1.1mm)[
          #polygon(fill: blue, stroke: none,
            (0mm, 0mm), (2.2mm, 1.1mm), (0mm, 2.2mm),
          )
        ]
      }
    ]
  ]
}

= Create your account

Choose *Get started* on the home page.

#annotated("01-account", 1000, 1532, 92mm, (
  (1, "Choose Student", 80, 368, 408, 105),
  (2, "Enter your details", 80, 557, 840, 622),
  (3, "Create account", 80, 1214, 840, 96),
))

#instruction(4, [Finish setup: choose your countries, university, and course. Confirm your starting funding.])

#text(size: 10pt, fill: rgb("57636e"))[Use fictional data for this demo. Already have an account? Sign in.]

#pagebreak()
= Choose a tuition route

#instruction(5, [Open *Payments*. Check tuition, set a future deadline and living-cost reserve, then save. Open a route's *Details*.])

#annotated("07-route", 960, 996, 104mm, (
  (6, "Check costs and arrival", 50, 443, 860, 315),
  (7, "Select and review", 372, 800, 512, 72),
))

#instruction(8, [In review, check the university and amount. Choose *Confirm recipient*.])

#text(size: 10pt, fill: rgb("57636e"))[Expired quote? Refresh it. Arrival is an estimate; recipient confirmation is a sandbox check.]

#pagebreak()
= Ask AI, then approve

Open *AI Agent*. Read the privacy notice and enable AI if you agree.

#instruction(9, [Type: “Prepare my tuition payment using my selected route.” Then send.])
#annotated("10-agent", 1480, 340, 125mm, (
  (9, "Send request", 1338, 176, 72, 72),
))

Return to *Payments*. Check the university, amount, fee, and arrival.

#annotated("11-approve", 1090, 1182, 100mm, (
  (10, "Tick to confirm", 2, 1024, 34, 34),
  (11, "Approve", 2, 1098, 1086, 80),
))

#text(size: 10pt, fill: rgb("57636e"))[The AI prepares. You approve. Nothing is sent yet.]

#pagebreak()
= Send and save

#annotated("12-send", 1090, 1104, 90mm, (
  (12, "Send payment", 2, 1020, 1086, 80),
))

Open *Profile / Security & activity / Payment history*.

#annotated("13-receipt", 1932, 1604, 113mm, (
  (13, "Download receipt", 1646, 427, 236, 72),
))

#text(size: 10pt, fill: rgb("57636e"))[Done. Your receipt records a simulated payment. No real money moved.]


// Compact page tour. The numbers below identify screenshots on each page.

#pagebreak()
= Dashboard and Move Planner

#text(weight: "bold", size: 11pt)[Dashboard] #text(size: 10pt)[See costs, funding, and your next step.]
#annotated("dashboard", 2560, 1720, 125mm, (
  (1, "Dashboard", 32, 173.59, 430, 88),
))

#text(weight: "bold", size: 11pt)[Move Planner] #text(size: 10pt)[Set arrival, months, and costs. Save your plan.]
#annotated("planner-settings", 2560, 1720, 125mm, (
  (2, "Move Planner", 562.53, 587.5, 1930.94, 388),
))


#pagebreak()
= Payments and Balances

#text(weight: "bold", size: 11pt)[Payments] #text(size: 10pt)[Compare tuition routes before choosing one.]
#annotated("05-compare", 2560, 1720, 125mm, (
  (1, "Payments", 32, 467.59, 430, 88),
))

#text(weight: "bold", size: 11pt)[Balances] #text(size: 10pt)[Review each currency and open its analysis.]
#annotated("balances", 2560, 1720, 125mm, (
  (2, "Balances", 562.53, 1170.62, 378, 80),
))


#pagebreak()
= Exchange and AI Agent

#text(weight: "bold", size: 11pt)[Exchange] #text(size: 10pt)[Enter an amount to see an estimate.]
#annotated("exchange", 2560, 1720, 108mm, (
  (1, "Exchange", 642.53, 672.38, 807.78, 80),
))

#text(weight: "bold", size: 11pt)[Rate alerts] #text(size: 10pt)[Set a target rate, then save.]
#annotated("rate-alert", 1932, 438, 108mm, (
  (2, "Rate alerts", 34.02, 312.39, 218.12, 80.04),
))

#text(weight: "bold", size: 11pt)[AI Agent] #text(size: 10pt)[Ask questions, inspect results, or start a new chat.]
#annotated("agent-tools", 2560, 1720, 108mm, (
  (3, "AI Agent", 2270, 36, 234, 72),
))


#pagebreak()
= Sponsors and chat history

#text(weight: "bold", size: 11pt)[Sponsors] #text(size: 10pt)[Create an invitation for a separate Sponsor account.]
#annotated("student-sponsors", 2560, 1720, 108mm, (
  (1, "Sponsors", 2231.47, 417, 262, 72),
))

#text(weight: "bold", size: 11pt)[Sharing] #text(size: 10pt)[Choose which summaries your sponsor can see.]
#annotated("sharing", 1932, 1132, 108mm, (
  (2, "Sharing", 50.03, 810.48, 32.02, 32.02),
))

#text(weight: "bold", size: 11pt)[Chat history] #text(size: 10pt)[Find an earlier conversation.]
#annotated("agent-history", 2064, 988, 108mm, (
  (3, "Chat history", 320, 447.81, 1424, 80),
))


#pagebreak()
= Sponsor: Overview and Students

#text(weight: "bold", size: 11pt)[Overview] #text(size: 10pt)[See the support you have promised.]
#annotated("sponsor-overview", 2560, 1720, 125mm, (
  (1, "Overview", 32, 221.59, 414, 88),
))

#text(weight: "bold", size: 11pt)[Students] #text(size: 10pt)[Review linked students and permitted information.]
#annotated("sponsor-students", 2560, 1720, 125mm, (
  (2, "Students", 32, 319.59, 414, 88),
))


#pagebreak()
= Sponsor: Requests, Activity, Connections

#text(weight: "bold", size: 11pt)[Requests] #text(size: 10pt)[Find and review student funding requests.]
#annotated("sponsor-requests", 2560, 1720, 108mm, (
  (1, "Requests", 32, 417.59, 414, 88),
))

#text(weight: "bold", size: 11pt)[Activity] #text(size: 10pt)[Review your sponsor activity.]
#annotated("sponsor-activity", 2560, 1720, 108mm, (
  (2, "Activity", 32, 515.59, 414, 88),
))

#text(weight: "bold", size: 11pt)[Connections] #text(size: 10pt)[Manage links to students.]
#annotated("sponsor-connections", 2560, 1720, 108mm, (
  (3, "Connections", 32, 613.59, 414, 88),
))


#pagebreak()
= Profile and Security

#text(weight: "bold", size: 11pt)[Profile] #text(size: 10pt)[Edit personal details, study information, and funding.]
#annotated("profile", 2560, 1720, 118mm, (
  (1, "Profile", 2123.47, 96.5, 258, 80),
))

#text(weight: "bold", size: 11pt)[Security] #text(size: 10pt)[Review payment limits and safeguards.]
#annotated("security", 1932, 632, 118mm, (
  (2, "Security", 0, 0, 1932, 632.0),
))

#text(weight: "bold", size: 11pt)[Activity log] #text(size: 10pt)[Inspect events or download your history.]
#annotated("activity", 1932, 770, 118mm, (
  (3, "Activity log", 1545.79, 50.03, 336.18, 72.04),
))


#pagebreak()
= Home and account controls

#text(weight: "bold", size: 11pt)[Home] #text(size: 10pt)[Get started, sign in, or explore the public preview.]
#annotated("home", 2560, 1720, 100mm, (
  (1, "Home", 153.59, 919.47, 346, 96),
))

#text(weight: "bold", size: 11pt)[Notifications] #text(size: 10pt)[Open the bell to review updates.]
#annotated("notifications", 720, 506, 80mm, (
  (2, "Notifications", 0, 0, 720, 505.56),
))

#text(weight: "bold", size: 11pt)[Appearance and help] #text(size: 10pt)[Switch theme or replay the guided tour.]
#annotated("appearance", 2560, 1720, 100mm, (
  (3, "Appearance and help", 211, 1472, 72, 72),
))
