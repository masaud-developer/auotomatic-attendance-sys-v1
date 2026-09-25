import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# Initialize 16:9 Widescreen Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# Theme Colors (Matching the website design)
C_DARK_BG       = RGBColor(15, 23, 42)    # #0F172A (Slate 900)
C_DARK_CARD     = RGBColor(30, 41, 59)    # #1E293B (Slate 800)
C_DARK_BORDER   = RGBColor(51, 65, 85)    # #334155 (Slate 700)
C_LIGHT_BG      = RGBColor(248, 250, 252) # #F8FAFC (Slate 50)
C_WHITE         = RGBColor(255, 255, 255) # #FFFFFF
C_CARD_BG       = RGBColor(255, 255, 255) # #FFFFFF
C_CARD_BG_MUTED = RGBColor(241, 245, 249) # #F1F5F9 (Slate 100)
C_BORDER        = RGBColor(226, 232, 240) # #E2E8F0 (Slate 200)

C_PRIMARY       = RGBColor(79, 70, 229)   # #4F46E5 (Indigo 600)
C_PRIMARY_DARK  = RGBColor(67, 56, 202)   # #4338CA (Indigo 700)
C_PRIMARY_LIGHT = RGBColor(238, 242, 255) # #EEF2FF (Indigo 50)
C_SUCCESS       = RGBColor(16, 185, 129)  # #10B981 (Emerald 500)
C_SUCCESS_LIGHT = RGBColor(236, 253, 245) # #ECFDF5 (Emerald 50)
C_WARNING       = RGBColor(245, 158, 11)  # #F59E0B (Amber 500)
C_DANGER        = RGBColor(239, 68, 68)   # #EF4444 (Rose 500)

C_TEXT_DARK     = RGBColor(15, 23, 42)    # #0F172A (Slate 900)
C_TEXT_BODY     = RGBColor(71, 85, 105)   # #475569 (Slate 600)
C_TEXT_MUTED    = RGBColor(100, 116, 139) # #64748B (Slate 500)
C_TEXT_LIGHT    = RGBColor(255, 255, 255) # #FFFFFF
C_TEXT_LIGHT_M  = RGBColor(203, 213, 225) # #CBD5E1 (Slate 300)

FONT_HEADING = "Plus Jakarta Sans"
FONT_BODY = "Plus Jakarta Sans"

def set_slide_background(slide, color):
    bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = color
    bg_shape.line.fill.background()
    return bg_shape

def add_header(slide, kicker: str, title: str, subtitle: str = None, dark: bool = False):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(11.7), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_kicker = tf.paragraphs[0]
    p_kicker.text = kicker.upper()
    p_kicker.font.name = FONT_HEADING
    p_kicker.font.size = Pt(11)
    p_kicker.font.bold = True
    p_kicker.font.color.rgb = C_PRIMARY if dark else C_PRIMARY
    p_kicker.space_after = Pt(4)

    p_title = tf.add_paragraph()
    p_title.text = title
    p_title.font.name = FONT_HEADING
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = C_TEXT_LIGHT if dark else C_TEXT_DARK
    
    if subtitle:
        p_title.space_after = Pt(2)
        p_sub = tf.add_paragraph()
        p_sub.text = subtitle
        p_sub.font.name = FONT_BODY
        p_sub.font.size = Pt(13)
        p_sub.font.color.rgb = C_TEXT_LIGHT_M if dark else C_TEXT_MUTED

def add_card(slide, x, y, w, h, bg_color=C_WHITE, border_color=C_BORDER):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    return shape

# ==========================================
# SLIDE 1: TITLE SLIDE (Dark Executive Theme)
# ==========================================
s1 = prs.slides.add_slide(blank_layout)
set_slide_background(s1, C_DARK_BG)

# Accent top glow bar
accent_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(0.1))
accent_bar.fill.solid()
accent_bar.fill.fore_color.rgb = C_PRIMARY
accent_bar.line.fill.background()

# Title Badge
badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.4), Inches(3.4), Inches(0.42))
badge.fill.solid()
badge.fill.fore_color.rgb = C_DARK_CARD
badge.line.color.rgb = C_PRIMARY
b_tf = badge.text_frame
b_tf.margin_left = Inches(0.15)
b_tf.margin_top = Inches(0.08)
bp = b_tf.paragraphs[0]
bp.text = "AI-POWERED BIOMETRIC SYSTEM"
bp.font.name = FONT_HEADING
bp.font.size = Pt(10)
bp.font.bold = True
bp.font.color.rgb = RGBColor(165, 180, 252) # Light indigo

# Title & Subtitle Box
tbox = s1.shapes.add_textbox(Inches(1.0), Inches(2.05), Inches(11.3), Inches(2.8))
ttf = tbox.text_frame
ttf.word_wrap = True
ttf.margin_left = ttf.margin_top = 0

p1 = ttf.paragraphs[0]
p1.text = "AttendEdge"
p1.font.name = FONT_HEADING
p1.font.size = Pt(46)
p1.font.bold = True
p1.font.color.rgb = C_TEXT_LIGHT
p1.space_after = Pt(10)

p2 = ttf.add_paragraph()
p2.text = "Enterprise Face Recognition & Automated Attendance Management System"
p2.font.name = FONT_HEADING
p2.font.size = Pt(21)
p2.font.bold = True
p2.font.color.rgb = RGBColor(226, 232, 240)
p2.space_after = Pt(12)

p3 = ttf.add_paragraph()
p3.text = "Next-Generation Contactless Biometrics with Real-Time Liveness Detection & Institution-Grade Analytics"
p3.font.name = FONT_BODY
p3.font.size = Pt(14)
p3.font.color.rgb = C_TEXT_LIGHT_M

# Key Features Pills Container
pill_data = [
    ("Real-Time Face Recognition", C_PRIMARY),
    ("Active Anti-Spoof Liveness", C_SUCCESS),
    ("Custom Session Engine", RGBColor(14, 165, 233)), # Sky
    ("Dual-Role RBAC Portal", RGBColor(245, 158, 11))   # Amber
]

px = 1.0
for text, col in pill_data:
    pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(px), Inches(5.1), Inches(2.65), Inches(0.55))
    pill.fill.solid()
    pill.fill.fore_color.rgb = C_DARK_CARD
    pill.line.color.rgb = col
    pill.line.width = Pt(1)
    ptf = pill.text_frame
    ptf.margin_top = Inches(0.12)
    pp = ptf.paragraphs[0]
    pp.alignment = PP_ALIGN.CENTER
    pp.text = text
    pp.font.name = FONT_HEADING
    pp.font.size = Pt(11)
    pp.font.bold = True
    pp.font.color.rgb = C_TEXT_LIGHT
    px += 2.88

# Footer Presenter details
f_box = s1.shapes.add_textbox(Inches(1.0), Inches(6.1), Inches(11.3), Inches(0.8))
ftf = f_box.text_frame
fp = ftf.paragraphs[0]
fp.text = "Presented by: Masaud Hasan & Project Team  •  Department of Computer Science & Engineering"
fp.font.name = FONT_BODY
fp.font.size = Pt(12)
fp.font.color.rgb = RGBColor(148, 163, 184)

# ==========================================
# SLIDE 2: THE PROBLEM & MOTIVATION
# ==========================================
s2 = prs.slides.add_slide(blank_layout)
set_slide_background(s2, C_LIGHT_BG)
add_header(s2, "Context & Challenges", "The Problem with Conventional Attendance Systems", 
           "Traditional paper sheets and RFID card punch systems present severe administrative and security vulnerabilities.")

# 3 Problem Cards
p_cards = [
    {
        "title": "Proxy Marking & Identity Fraud",
        "tag": "SECURITY VULNERABILITY",
        "color": C_DANGER,
        "points": [
            "Buddy punching & signature forgery are rampant in large classes.",
            "ID cards can be easily shared, cloned, or tapped by peers.",
            "Zero cryptographic proof that the student was physically present."
        ]
    },
    {
        "title": "Massive Instructional Time Loss",
        "tag": "CLASSROOM INEFFICIENCY",
        "color": C_WARNING,
        "points": [
            "Manual roll calls consume 10 to 15 minutes of every lecture hour.",
            "Cumulative loss of over 40+ instructional hours per semester.",
            "Teachers act as manual record-keepers instead of focusing on instruction."
        ]
    },
    {
        "title": "Data Fragmentation & Delayed Audits",
        "tag": "ADMINISTRATIVE OVERHEAD",
        "color": C_PRIMARY,
        "points": [
            "Disjointed register books and scattered spreadsheets.",
            "Zero real-time visibility into attendance percentages or absentees.",
            "Eligibility disputes right before exam hall-ticket issuances."
        ]
    }
]

cx = 0.8
for card in p_cards:
    add_card(s2, cx, 2.05, 3.7, 4.8)
    
    # Tag badge
    tb = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx + 0.3), Inches(2.3), Inches(3.1), Inches(0.35))
    tb.fill.solid()
    tb.fill.fore_color.rgb = C_CARD_BG_MUTED
    tb.line.color.rgb = card["color"]
    tb.line.width = Pt(1)
    tt = tb.text_frame
    tt.margin_top = Inches(0.06)
    tp = tt.paragraphs[0]
    tp.text = card["tag"]
    tp.font.name = FONT_HEADING
    tp.font.size = Pt(9)
    tp.font.bold = True
    tp.font.color.rgb = card["color"]
    
    # Card Content
    ctb = s2.shapes.add_textbox(Inches(cx + 0.3), Inches(2.8), Inches(3.1), Inches(3.8))
    ctf = ctb.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = 0
    
    head = ctf.paragraphs[0]
    head.text = card["title"]
    head.font.name = FONT_HEADING
    head.font.size = Pt(17)
    head.font.bold = True
    head.font.color.rgb = C_TEXT_DARK
    head.space_after = Pt(14)
    
    for pt in card["points"]:
        p = ctf.add_paragraph()
        p.text = "• " + pt
        p.font.name = FONT_BODY
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_BODY
        p.space_after = Pt(10)
        
    cx += 4.0

# ==========================================
# SLIDE 3: SYSTEM ARCHITECTURE
# ==========================================
s3 = prs.slides.add_slide(blank_layout)
set_slide_background(s3, C_LIGHT_BG)
add_header(s3, "Architecture & Engineering", "End-to-End Full-Stack System Design",
           "Modern decoupled architecture built for high concurrency, zero latency, and hardware independence.")

arch_layers = [
    {
        "layer": "FRONTEND LAYER",
        "tech": "React 19 + TypeScript + Vite",
        "color": C_PRIMARY,
        "items": [
            "Apple-Inspired Clean UI: SF Pro / Plus Jakarta Sans typography stack.",
            "Hardware Webcam Control: Zero background camera drain; instant hardware release.",
            "Dual Dedicated Portals: Independent responsive views for Admin & Student.",
            "Real-Time HUD: Animated laser reticle, instant audio-visual sound effects."
        ]
    },
    {
        "layer": "BACKEND API LAYER",
        "tech": "FastAPI (Python 3.11) + REST API",
        "color": RGBColor(14, 165, 233), # Sky
        "items": [
            "High-Throughput ASGI: Asynchronous non-blocking request processing.",
            "Security & Auth: JWT HS256 stateless tokens with Bcrypt password hashing.",
            "Strict RBAC Protection: Route-level role authorization guards.",
            "Interactive OpenAPI: Complete auto-generated Swagger documentation at /docs."
        ]
    },
    {
        "layer": "COMPUTER VISION ENGINE",
        "tech": "OpenCV YuNet + SFace CNN",
        "color": C_SUCCESS,
        "items": [
            "Deep Learning Detector: YuNet extracts 5 distinct facial landmarks.",
            "Hyperspherical Embeddings: SFace produces 128-D L2-normalized vectors.",
            "Active Liveness Verification: Random motion challenges thwart spoofing.",
            "Duplicate Face Rejection: Cosine similarity comparison on enrollment."
        ]
    }
]

ax = 0.8
for layer in arch_layers:
    add_card(s3, ax, 2.05, 3.7, 4.8)
    
    # Layer Banner
    lb = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(ax + 0.3), Inches(2.3), Inches(3.1), Inches(0.4))
    lb.fill.solid()
    lb.fill.fore_color.rgb = C_PRIMARY_LIGHT if layer["color"] == C_PRIMARY else C_SUCCESS_LIGHT if layer["color"] == C_SUCCESS else RGBColor(240, 249, 255)
    lb.line.color.rgb = layer["color"]
    lt = lb.text_frame
    lt.margin_top = Inches(0.08)
    lp = lt.paragraphs[0]
    lp.text = layer["layer"]
    lp.font.name = FONT_HEADING
    lp.font.size = Pt(10)
    lp.font.bold = True
    lp.font.color.rgb = layer["color"]
    
    # Text box
    atb = s3.shapes.add_textbox(Inches(ax + 0.3), Inches(2.85), Inches(3.1), Inches(3.8))
    atf = atb.text_frame
    atf.word_wrap = True
    atf.margin_left = atf.margin_top = 0
    
    tech = atf.paragraphs[0]
    tech.text = layer["tech"]
    tech.font.name = FONT_HEADING
    tech.font.size = Pt(15)
    tech.font.bold = True
    tech.font.color.rgb = C_TEXT_DARK
    tech.space_after = Pt(12)
    
    for it in layer["items"]:
        p = atf.add_paragraph()
        p.text = "• " + it
        p.font.name = FONT_BODY
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_BODY
        p.space_after = Pt(8)
        
    ax += 4.0

# ==========================================
# SLIDE 4: BIOMETRIC RECOGNITION PIPELINE
# ==========================================
s4 = prs.slides.add_slide(blank_layout)
set_slide_background(s4, C_LIGHT_BG)
add_header(s4, "Core Computer Vision", "Biometric Face Recognition Pipeline",
           "State-of-the-art neural pipeline executing deep-learning detection and recognition in under 150 milliseconds.")

# 4 Step horizontal pipeline cards
steps = [
    {
        "step": "STAGE 1",
        "title": "Camera Capture & Pre-processing",
        "desc": "High-definition frame capture via browser WebRTC. RGB conversion, normalization, and scale optimization.",
        "badge": "Input Frame"
    },
    {
        "step": "STAGE 2",
        "title": "YuNet Face & Landmark Detection",
        "desc": "Ultra-fast deep neural net locates bounding boxes and 5 precise facial landmarks (eyes, nose, mouth corners).",
        "badge": "YuNet ONNX"
    },
    {
        "step": "STAGE 3",
        "title": "SFace 128-D Embedding Generation",
        "desc": "Affine transformation aligns the face before passing into SFace CNN to extract 128-dimensional L2-norm float vectors.",
        "badge": "SFace CNN"
    },
    {
        "step": "STAGE 4",
        "title": "Cosine Similarity Matching",
        "desc": "High-speed cosine distance comparison against enrolled biometric repository. Verified if similarity > 0.58 threshold.",
        "badge": "Database Match"
    }
]

sx = 0.8
for i, st in enumerate(steps):
    card = add_card(s4, sx, 2.05, 2.75, 4.0)
    
    tb = s4.shapes.add_textbox(Inches(sx + 0.25), Inches(2.25), Inches(2.25), Inches(3.6))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = 0
    
    s_p = tf.paragraphs[0]
    s_p.text = st["step"]
    s_p.font.name = FONT_HEADING
    s_p.font.size = Pt(10)
    s_p.font.bold = True
    s_p.font.color.rgb = C_PRIMARY
    s_p.space_after = Pt(4)
    
    t_p = tf.add_paragraph()
    t_p.text = st["title"]
    t_p.font.name = FONT_HEADING
    t_p.font.size = Pt(14)
    t_p.font.bold = True
    t_p.font.color.rgb = C_TEXT_DARK
    t_p.space_after = Pt(10)
    
    d_p = tf.add_paragraph()
    d_p.text = st["desc"]
    d_p.font.name = FONT_BODY
    d_p.font.size = Pt(11.5)
    d_p.font.color.rgb = C_TEXT_BODY
    d_p.space_after = Pt(16)
    
    # Bottom badge
    bd = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(sx + 0.25), Inches(5.35), Inches(2.25), Inches(0.4))
    bd.fill.solid()
    bd.fill.fore_color.rgb = C_PRIMARY_LIGHT
    bd.line.color.rgb = C_PRIMARY
    bdt = bd.text_frame
    bdt.margin_top = Inches(0.08)
    bdp = bdt.paragraphs[0]
    bdp.alignment = PP_ALIGN.CENTER
    bdp.text = st["badge"]
    bdp.font.name = FONT_HEADING
    bdp.font.size = Pt(9.5)
    bdp.font.bold = True
    bdp.font.color.rgb = C_PRIMARY_DARK
    
    sx += 2.95

# Bottom summary banner
banner = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.25), Inches(11.7), Inches(0.8))
banner.fill.solid()
banner.fill.fore_color.rgb = C_DARK_BG
banner.line.fill.background()
btf = banner.text_frame
btf.margin_left = Inches(0.3)
btf.margin_top = Inches(0.2)
bp = btf.paragraphs[0]
bp.text = "BENCHMARK PERFORMANCE:  Sub-150ms verification latency  •  Cosine Similarity Threshold: 0.58  •  Sub-pixel Landmark Alignment"
bp.font.name = FONT_HEADING
bp.font.size = Pt(12)
bp.font.bold = True
bp.font.color.rgb = C_TEXT_LIGHT

# ==========================================
# SLIDE 5: ANTI-SPOOFING & LIVENESS
# ==========================================
s5 = prs.slides.add_slide(blank_layout)
set_slide_background(s5, C_LIGHT_BG)
add_header(s5, "Biometric Security", "Anti-Spoofing & Active Liveness Protection",
           "Multi-tier security mechanisms prevent presentation attacks, printed photographs, and replay attempts.")

# 2 Large Comparison Cards
add_card(s5, 0.8, 2.05, 5.65, 4.8)
add_card(s5, 6.85, 2.05, 5.65, 4.8)

# Left: Passive Checks
ptb = s5.shapes.add_textbox(Inches(1.1), Inches(2.3), Inches(5.05), Inches(4.3))
ptf = ptb.text_frame
ptf.word_wrap = True
ptf.margin_left = ptf.margin_top = 0

ph1 = ptf.paragraphs[0]
ph1.text = "PASSIVE QUALITY AUDIT"
ph1.font.name = FONT_HEADING
ph1.font.size = Pt(11)
ph1.font.bold = True
ph1.font.color.rgb = C_PRIMARY
ph1.space_after = Pt(4)

ph2 = ptf.add_paragraph()
ph2.text = "Autonomous Frame Health Checks"
ph2.font.name = FONT_HEADING
ph2.font.size = Pt(18)
ph2.font.bold = True
ph2.font.color.rgb = C_TEXT_DARK
ph2.space_after = Pt(12)

checks = [
    ("Laplacian Variance Blur Detection", "Discards blurry, fast-moving, or low-resolution captures to ensure pristine face embeddings."),
    ("Illumination & Contrast Balance", "Evaluates ambient lighting histograms to reject overexposed glare or deep shadows."),
    ("Face Scale & Bounding Ratio", "Ensures the user is positioned at optimal proximity without extreme zoom or distortion."),
    ("Zero User Friction", "Runs transparently on every single video frame without prompting user intervention.")
]

for title, desc in checks:
    p = ptf.add_paragraph()
    p.text = "• " + title + ": "
    p.font.name = FONT_HEADING
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    
    sub = ptf.add_paragraph()
    sub.text = "  " + desc
    sub.font.name = FONT_BODY
    sub.font.size = Pt(11)
    sub.font.color.rgb = C_TEXT_BODY
    sub.space_after = Pt(8)

# Right: Active Liveness
rtb = s5.shapes.add_textbox(Inches(7.15), Inches(2.3), Inches(5.05), Inches(4.3))
rtf = rtb.text_frame
rtf.word_wrap = True
rtf.margin_left = rtf.margin_top = 0

rh1 = rtf.paragraphs[0]
rh1.text = "ACTIVE CHALLENGE VERIFICATION"
rh1.font.name = FONT_HEADING
rh1.font.size = Pt(11)
rh1.font.bold = True
rh1.font.color.rgb = C_SUCCESS
rh1.space_after = Pt(4)

rh2 = rtf.add_paragraph()
rh2.text = "Interactive Motion Challenges"
rh2.font.name = FONT_HEADING
rh2.font.size = Pt(18)
rh2.font.bold = True
rh2.font.color.rgb = C_TEXT_DARK
rh2.space_after = Pt(12)

liveness_pts = [
    ("Dynamic Challenge Sequences", "System randomly demands real-time gestures: Blink, Smile, Turn Head Left, or Turn Head Right."),
    ("Anti-Screen Replay Defense", "Static paper printouts and pre-recorded smartphone videos fail randomized sequence timing."),
    ("Facial Landmark Tracking", "Measures aspect ratio changes (EAR for blinks, mouth width-to-height for smiles)."),
    ("Duplicate Face Detection", "Compares new enrollments across entire database to prevent duplicate identity creation.")
]

for title, desc in liveness_pts:
    p = rtf.add_paragraph()
    p.text = "• " + title + ": "
    p.font.name = FONT_HEADING
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    
    sub = rtf.add_paragraph()
    sub.text = "  " + desc
    sub.font.name = FONT_BODY
    sub.font.size = Pt(11)
    sub.font.color.rgb = C_TEXT_BODY
    sub.space_after = Pt(8)

# ==========================================
# SLIDE 6: SCANNER & CUSTOM SESSION ENGINE
# ==========================================
s6 = prs.slides.add_slide(blank_layout)
set_slide_background(s6, C_LIGHT_BG)
add_header(s6, "Operational Workflow", "Live Scanner & Dynamic Session Engine",
           "Empowering administrators with complete operational flexibility without rigid pre-configurations.")

# 3 Workflow Cards
flow_cards = [
    {
        "num": "01",
        "title": "On-Demand Session Creation",
        "tag": "ADMIN CONTROL",
        "color": C_PRIMARY,
        "items": [
            "Manual Entry: Enter exact subject name, room, and session title.",
            "Custom Time Periods: Admin sets explicit start and end hours without rigid defaults.",
            "Flexible Session Types: Regular lectures, lab practicals, exams, or seminars.",
            "Immediate Activation: Launch live attendance monitoring with a single click."
        ]
    },
    {
        "num": "02",
        "title": "Live Camera HUD & Hardware Stop",
        "tag": "HARDWARE RELIABILITY",
        "color": C_SUCCESS,
        "items": [
            "Real-Time Video HUD: Animated target laser reticle with instant biometric detection.",
            "Complete Hardware Stop: Dedicated stop button releases all browser camera tracks.",
            "Zero Background Drain: Webcam LED powers off immediately when stopped.",
            "Dual-Tone Audio Cues: Synthesized Web Audio tones for instant scan feedback."
        ]
    },
    {
        "num": "03",
        "title": "Rule Enforcement & Attendance Logic",
        "tag": "DATA INTEGRITY",
        "color": RGBColor(14, 165, 233), # Sky
        "items": [
            "DB Unique Constraints: Strict (session_id, student_id) uniqueness prevents duplicates.",
            "Automatic Late Arrival: Auto-flags late check-ins beyond institutional grace period.",
            "Check-In & Check-Out: Measures total classroom contact duration in minutes.",
            "Instant UI Feedback: Displays student name, roll number, time, and photo match."
        ]
    }
]

fx = 0.8
for card in flow_cards:
    add_card(s6, fx, 2.05, 3.7, 4.8)
    
    # Top Number Badge
    nb = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(fx + 0.3), Inches(2.3), Inches(0.55), Inches(0.4))
    nb.fill.solid()
    nb.fill.fore_color.rgb = card["color"]
    nb.line.fill.background()
    nbt = nb.text_frame
    nbt.margin_top = Inches(0.08)
    np = nbt.paragraphs[0]
    np.alignment = PP_ALIGN.CENTER
    np.text = card["num"]
    np.font.name = FONT_HEADING
    np.font.size = Pt(12)
    np.font.bold = True
    np.font.color.rgb = C_TEXT_LIGHT
    
    # Card Header
    ctb = s6.shapes.add_textbox(Inches(fx + 0.3), Inches(2.9), Inches(3.1), Inches(3.7))
    ctf = ctb.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = 0
    
    head = ctf.paragraphs[0]
    head.text = card["title"]
    head.font.name = FONT_HEADING
    head.font.size = Pt(16)
    head.font.bold = True
    head.font.color.rgb = C_TEXT_DARK
    head.space_after = Pt(12)
    
    for it in card["items"]:
        p = ctf.add_paragraph()
        p.text = "• " + it
        p.font.name = FONT_BODY
        p.font.size = Pt(11.5)
        p.font.color.rgb = C_TEXT_BODY
        p.space_after = Pt(8)
        
    fx += 4.0

# ==========================================
# SLIDE 7: DUAL-ROLE PORTALS (ADMIN VS STUDENT)
# ==========================================
s7 = prs.slides.add_slide(blank_layout)
set_slide_background(s7, C_LIGHT_BG)
add_header(s7, "User Experience & RBAC", "Tailored Dual-Role Application Portals",
           "Strict privilege isolation between institutional administrators and enrolled students.")

add_card(s7, 0.8, 2.05, 5.65, 4.8)
add_card(s7, 6.85, 2.05, 5.65, 4.8)

# Admin Portal
atb = s7.shapes.add_textbox(Inches(1.1), Inches(2.3), Inches(5.05), Inches(4.3))
atf = atb.text_frame
atf.word_wrap = True
atf.margin_left = atf.margin_top = 0

ah1 = atf.paragraphs[0]
ah1.text = "ADMINISTRATOR DASHBOARD"
ah1.font.name = FONT_HEADING
ah1.font.size = Pt(11)
ah1.font.bold = True
ah1.font.color.rgb = C_PRIMARY
ah1.space_after = Pt(4)

ah2 = atf.add_paragraph()
ah2.text = "Comprehensive Command & Oversight"
ah2.font.name = FONT_HEADING
ah2.font.size = Pt(18)
ah2.font.bold = True
ah2.font.color.rgb = C_TEXT_DARK
ah2.space_after = Pt(12)

admin_feats = [
    ("Live Attendance Terminal", "Operate real-time camera stations with instant audio-visual scan confirmations."),
    ("Complete Student Lifecycle", "Register students with multi-angle photos, edit metadata, or delete inactive profiles."),
    ("Attendance Correction & Override", "Manual status adjustments with mandatory recorded justification for compliance."),
    ("CSV Intelligence Export", "Filter by department, session, or date and export formatted attendance spreadsheets."),
    ("System Threshold Configuration", "Adjust similarity margins, grace periods, and liveness sensitivities.")
]

for title, desc in admin_feats:
    p = atf.add_paragraph()
    p.text = "✔ " + title + ": "
    p.font.name = FONT_HEADING
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    
    sub = atf.add_paragraph()
    sub.text = "   " + desc
    sub.font.name = FONT_BODY
    sub.font.size = Pt(10.5)
    sub.font.color.rgb = C_TEXT_BODY
    sub.space_after = Pt(6)

# Student Portal
stb = s7.shapes.add_textbox(Inches(7.15), Inches(2.3), Inches(5.05), Inches(4.3))
stf = stb.text_frame
stf.word_wrap = True
stf.margin_left = stf.margin_top = 0

sh1 = stf.paragraphs[0]
sh1.text = "STUDENT PERSONAL PORTAL"
sh1.font.name = FONT_HEADING
sh1.font.size = Pt(11)
sh1.font.bold = True
sh1.font.color.rgb = C_SUCCESS
sh1.space_after = Pt(4)

sh2 = stf.add_paragraph()
sh2.text = "Transparent Attendance Self-Service"
sh2.font.name = FONT_HEADING
sh2.font.size = Pt(18)
sh2.font.bold = True
sh2.font.color.rgb = C_TEXT_DARK
sh2.space_after = Pt(12)

student_feats = [
    ("Aggregate Attendance Percentage", "Real-time visual percentage dial comparing attendance against the 75% institutional requirement."),
    ("Subject-Wise Breakdown", "Detailed subject cards displaying total conducted classes, attended count, and individual percentages."),
    ("Eligibility & Defaulter Alert", "Instant visual badges warning students when their attendance dips below safe exam eligibility levels."),
    ("Immutable Session Logbook", "Detailed historical timeline of every lecture scanned with timestamps and entry modes."),
    ("Multi-Identifier Login", "Seamless authentication using Student ID (STU-XXXX), registered email, or verified phone.")
]

for title, desc in student_feats:
    p = stf.add_paragraph()
    p.text = "✔ " + title + ": "
    p.font.name = FONT_HEADING
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    
    sub = stf.add_paragraph()
    sub.text = "   " + desc
    sub.font.name = FONT_BODY
    sub.font.size = Pt(10.5)
    sub.font.color.rgb = C_TEXT_BODY
    sub.space_after = Pt(6)

# ==========================================
# SLIDE 8: ANALYTICS & AUDIT COMPLIANCE
# ==========================================
s8 = prs.slides.add_slide(blank_layout)
set_slide_background(s8, C_LIGHT_BG)
add_header(s8, "Institutional Intelligence", "Analytics, Audit Logging & Compliance",
           "Ensuring absolute institutional transparency, dispute resolution, and regulatory audit compliance.")

# Top 4 Stat Metric Cards
stat_data = [
    ("Sub-150ms", "SCAN LATENCY", C_PRIMARY),
    ("100%", "PROXY ELIMINATION", C_SUCCESS),
    ("75%", "ELIGIBILITY THRESHOLD", RGBColor(14, 165, 233)),
    ("Zero", "LOST LECTURE TIME", RGBColor(245, 158, 11))
]

st_x = 0.8
for val, lbl, col in stat_data:
    add_card(s8, st_x, 2.05, 2.75, 1.25)
    tb = s8.shapes.add_textbox(Inches(st_x + 0.2), Inches(2.15), Inches(2.35), Inches(1.0))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = 0
    
    p1 = tf.paragraphs[0]
    p1.alignment = PP_ALIGN.CENTER
    p1.text = val
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(24)
    p1.font.bold = True
    p1.font.color.rgb = col
    
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    p2.text = lbl
    p2.font.name = FONT_HEADING
    p2.font.size = Pt(9)
    p2.font.bold = True
    p2.font.color.rgb = C_TEXT_MUTED
    
    st_x += 2.95

# 2 Bottom Cards
add_card(s8, 0.8, 3.5, 5.65, 3.4)
add_card(s8, 6.85, 3.5, 5.65, 3.4)

# Left: Analytics
ltb = s8.shapes.add_textbox(Inches(1.1), Inches(3.7), Inches(5.05), Inches(3.0))
ltf = ltb.text_frame
ltf.word_wrap = True
ltf.margin_left = ltf.margin_top = 0

lh1 = ltf.paragraphs[0]
lh1.text = "DYNAMIC RECHARTS VISUALIZATION"
lh1.font.name = FONT_HEADING
lh1.font.size = Pt(11)
lh1.font.bold = True
lh1.font.color.rgb = C_PRIMARY
lh1.space_after = Pt(4)

lh2 = ltf.add_paragraph()
lh2.text = "Institutional Trend Intelligence"
lh2.font.name = FONT_HEADING
lh2.font.size = Pt(16)
lh2.font.bold = True
lh2.font.color.rgb = C_TEXT_DARK
lh2.space_after = Pt(10)

l_items = [
    "Attendance percentage trends visualized across days and academic terms.",
    "Subject-by-subject comparative analysis to identify low engagement areas.",
    "Dedicated Absent & Late Student filter views for targeted counselor follow-ups.",
    "Instant CSV export capturing student roll, timestamp, and verification confidence."
]
for it in l_items:
    p = ltf.add_paragraph()
    p.text = "• " + it
    p.font.name = FONT_BODY
    p.font.size = Pt(11)
    p.font.color.rgb = C_TEXT_BODY
    p.space_after = Pt(6)

# Right: Audit Logs
rtb2 = s8.shapes.add_textbox(Inches(7.15), Inches(3.7), Inches(5.05), Inches(3.0))
rtf2 = rtb2.text_frame
rtf2.word_wrap = True
rtf2.margin_left = rtf2.margin_top = 0

rh1_2 = rtf2.paragraphs[0]
rh1_2.text = "REGULATORY AUDIT TRAIL"
rh1_2.font.name = FONT_HEADING
rh1_2.font.size = Pt(11)
rh1_2.font.bold = True
rh1_2.font.color.rgb = C_SUCCESS
rh1_2.space_after = Pt(4)

rh2_2 = rtf2.add_paragraph()
rh2_2.text = "Immutable Accountability"
rh2_2.font.name = FONT_HEADING
rh2_2.font.size = Pt(16)
rh2_2.font.bold = True
rh2_2.font.color.rgb = C_TEXT_DARK
rh2_2.space_after = Pt(10)

r_items = [
    "Every manual correction strictly requires an authorized reason log.",
    "Tracks admin user ID, student ID, previous status, new status, and exact timestamp.",
    "Eliminates arbitrary mark tampering and provides legal defense in disputes.",
    "Meets strict university accreditation and educational board inspection standards."
]
for it in r_items:
    p = rtf2.add_paragraph()
    p.text = "• " + it
    p.font.name = FONT_BODY
    p.font.size = Pt(11)
    p.font.color.rgb = C_TEXT_BODY
    p.space_after = Pt(6)

# ==========================================
# SLIDE 9: INSTITUTIONAL VALUE & BENCHMARKS
# ==========================================
s9 = prs.slides.add_slide(blank_layout)
set_slide_background(s9, C_LIGHT_BG)
add_header(s9, "Value Proposition", "Real-World Institutional Impact",
           "Quantifiable efficiency gains and cost advantages over traditional and legacy biometric systems.")

value_cards = [
    {
        "title": "Zero Dedicated Hardware Costs",
        "tag": "HARDWARE INDEPENDENCE",
        "color": C_PRIMARY,
        "points": [
            "Runs on standard existing teacher laptops, tablets, or basic USB webcams.",
            "No expensive proprietary biometric turnstiles or fingerprint scanners required.",
            "Eliminates hardware maintenance contracts and fingerprint sensor wear-and-tear."
        ]
    },
    {
        "title": "Recovers 40+ Lecture Hours",
        "tag": "ACADEMIC EFFICIENCY",
        "color": C_SUCCESS,
        "points": [
            "Reduces roll-call duration from 12 minutes down to seamless walk-by scanning.",
            "Preserves 100% of syllabus teaching time across all academic departments.",
            "Faculty can immediately start lecturing without administrative interruptions."
        ]
    },
    {
        "title": "Zero Proxy & Dispute Defense",
        "tag": "INSTITUTIONAL INTEGRITY",
        "color": RGBColor(14, 165, 233), # Sky
        "points": [
            "Total elimination of fraudulent sign-ins and proxy attendance.",
            "Defensible audit trails and timestamped logs during semester end reviews.",
            "Automated warnings empower students to manage attendance before exams."
        ]
    }
]

vx = 0.8
for card in value_cards:
    add_card(s9, vx, 2.05, 3.7, 4.8)
    
    # Tag
    tb = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(vx + 0.3), Inches(2.3), Inches(3.1), Inches(0.35))
    tb.fill.solid()
    tb.fill.fore_color.rgb = C_CARD_BG_MUTED
    tb.line.color.rgb = card["color"]
    tb.line.width = Pt(1)
    tt = tb.text_frame
    tt.margin_top = Inches(0.06)
    tp = tt.paragraphs[0]
    tp.text = card["tag"]
    tp.font.name = FONT_HEADING
    tp.font.size = Pt(9)
    tp.font.bold = True
    tp.font.color.rgb = card["color"]
    
    # Content
    ctb = s9.shapes.add_textbox(Inches(vx + 0.3), Inches(2.8), Inches(3.1), Inches(3.8))
    ctf = ctb.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = 0
    
    head = ctf.paragraphs[0]
    head.text = card["title"]
    head.font.name = FONT_HEADING
    head.font.size = Pt(17)
    head.font.bold = True
    head.font.color.rgb = C_TEXT_DARK
    head.space_after = Pt(14)
    
    for pt in card["points"]:
        p = ctf.add_paragraph()
        p.text = "• " + pt
        p.font.name = FONT_BODY
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_BODY
        p.space_after = Pt(10)
        
    vx += 4.0

# ==========================================
# SLIDE 10: CONCLUSION & DEMONSTRATION (Dark Theme)
# ==========================================
s10 = prs.slides.add_slide(blank_layout)
set_slide_background(s10, C_DARK_BG)

# Accent top bar
bar10 = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(0.1))
bar10.fill.solid()
bar10.fill.fore_color.rgb = C_PRIMARY
bar10.line.fill.background()

# Central Box
c_box = s10.shapes.add_textbox(Inches(1.5), Inches(1.5), Inches(10.3), Inches(4.5))
ctf10 = c_box.text_frame
ctf10.word_wrap = True
ctf10.margin_left = ctf10.margin_top = 0

cp1 = ctf10.paragraphs[0]
cp1.alignment = PP_ALIGN.CENTER
cp1.text = "ATTENDEDGE"
cp1.font.name = FONT_HEADING
cp1.font.size = Pt(14)
cp1.font.bold = True
cp1.font.color.rgb = RGBColor(165, 180, 252) # Light indigo
cp1.space_after = Pt(10)

cp2 = ctf10.add_paragraph()
cp2.alignment = PP_ALIGN.CENTER
cp2.text = "Smart, Contactless & Fraud-Proof Attendance"
cp2.font.name = FONT_HEADING
cp2.font.size = Pt(36)
cp2.font.bold = True
cp2.font.color.rgb = C_TEXT_LIGHT
cp2.space_after = Pt(16)

cp3 = ctf10.add_paragraph()
cp3.alignment = PP_ALIGN.CENTER
cp3.text = "Transforming institutional administration with high-speed biometrics, anti-spoofing intelligence, and effortless compliance."
cp3.font.name = FONT_BODY
cp3.font.size = Pt(16)
cp3.font.color.rgb = C_TEXT_LIGHT_M
cp3.space_after = Pt(36)

# 4 Key Takeaways in a horizontal grid
tk_data = [
    "Sub-150ms Speed",
    "Active Anti-Spoof",
    "Hardware Control",
    "Complete Transparency"
]

tx = 1.8
for tk in tk_data:
    tb = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(tx), Inches(4.4), Inches(2.2), Inches(0.55))
    tb.fill.solid()
    tb.fill.fore_color.rgb = C_DARK_CARD
    tb.line.color.rgb = C_PRIMARY
    tbt = tb.text_frame
    tbt.margin_top = Inches(0.12)
    tp = tbt.paragraphs[0]
    tp.alignment = PP_ALIGN.CENTER
    tp.text = tk
    tp.font.name = FONT_HEADING
    tp.font.size = Pt(11)
    tp.font.bold = True
    tp.font.color.rgb = C_TEXT_LIGHT
    tx += 2.5

# Thank You / Q&A Box
q_box = s10.shapes.add_textbox(Inches(1.5), Inches(5.6), Inches(10.3), Inches(1.2))
qtf = q_box.text_frame
qp = qtf.paragraphs[0]
qp.alignment = PP_ALIGN.CENTER
qp.text = "Thank You!"
qp.font.name = FONT_HEADING
qp.font.size = Pt(28)
qp.font.bold = True
qp.font.color.rgb = C_TEXT_LIGHT
qp.space_after = Pt(6)

qp2 = qtf.add_paragraph()
qp2.alignment = PP_ALIGN.CENTER
qp2.text = "We welcome your questions and are ready for the live system demonstration."
qp2.font.name = FONT_BODY
qp2.font.size = Pt(13)
qp2.font.color.rgb = RGBColor(148, 163, 184)

# Output Presentation
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AttendEdge_Presentation.pptx")
prs.save(output_path)
print(f"Presentation saved successfully to {output_path} (Total Slides: {len(prs.slides)})")
