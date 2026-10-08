from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

from build_srs import (
    add_bullets, add_caption, add_picture, add_table, keep_with_next,
    make_architecture, make_dfd, make_er, make_use_case, set_cell_margins,
    set_cell_shading,
)

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT = ROOT / "deliverables" / "ZTAP_Software_Requirements_Specification.docx"
ASSETS = ROOT / "deliverables" / "srs_assets"
NAVY = "17365D"
BLUE = "2F75B5"
TEXT = "1F2937"
FONT = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def pil_font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


def rounded(draw, xy, text, fill, outline="#2F75B5", size=25):
    draw.rounded_rectangle(xy, radius=16, fill=fill, outline=outline, width=4)
    box = draw.textbbox((0, 0), text, font=pil_font(size, True))
    cx = (xy[0] + xy[2]) / 2
    cy = (xy[1] + xy[3]) / 2
    draw.multiline_text((cx, cy), text, font=pil_font(size, True), fill="#172B4D", anchor="mm", align="center", spacing=5)


def arrow(draw, start, end, color="#5E6C84", width=4):
    draw.line((*start, *end), fill=color, width=width)
    import math
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    for delta in (0.55, -0.55):
        x = end[0] - 18 * math.cos(angle + delta)
        y = end[1] - 18 * math.sin(angle + delta)
        draw.line((end[0], end[1], x, y), fill=color, width=width)


def make_level0(path):
    im = Image.new("RGB", (1800, 1050), "white")
    d = ImageDraw.Draw(im)
    d.text((55, 40), "Zero Trust Access Portal DFD Level 0", font=pil_font(42, True), fill="#17365D")
    rounded(d, (650, 350, 1150, 690), "ZERO TRUST\nACCESS PORTAL", "#EAF2F8", size=34)
    nodes = [
        ((90, 180, 410, 330), "Employee", (650, 430), (410, 255)),
        ((90, 760, 410, 910), "Administrator", (650, 585), (410, 835)),
        ((1390, 180, 1710, 330), "Resource Owner", (1150, 430), (1390, 255)),
        ((1390, 760, 1710, 910), "Auditor", (1150, 585), (1390, 835)),
    ]
    for box, label, system_point, actor_point in nodes:
        rounded(d, box, label, "#FFFFFF", outline="#42526E")
        arrow(d, actor_point, system_point)
        arrow(d, system_point, actor_point)
    d.text((900, 965), "Trust boundary: all external requests are untrusted until authenticated, authorized and evaluated", font=pil_font(22), fill="#B54708", anchor="mm")
    im.save(path)


def make_attack_tree(path):
    im = Image.new("RGB", (2000, 1200), "white")
    d = ImageDraw.Draw(im)
    d.text((55, 35), "Attack Tree for Unauthorized Access", font=pil_font(42, True), fill="#17365D")
    rounded(d, (640, 110, 1360, 260), "ROOT GOAL\nGain unauthorized access to a sensitive application", "#FDEDEC", outline="#C0392B", size=27)
    rounded(d, (160, 400, 610, 540), "Compromise identity\nOR", "#FFF4E5")
    rounded(d, (775, 400, 1225, 540), "Bypass policy decision\nOR", "#FFF4E5")
    rounded(d, (1390, 400, 1840, 540), "Abuse approval path\nOR", "#FFF4E5")
    for x in (385, 1000, 1615): arrow(d, (1000, 260), (x, 400))
    leaves = [
        (40, 700, 420, 835, "Credential theft"), (450, 700, 830, 835, "Session replay"),
        (810, 700, 1190, 835, "Role escalation"), (1210, 700, 1590, 835, "Trusted-device spoofing"),
        (1580, 700, 1960, 835, "Self-approval or owner abuse"),
    ]
    for x1, y1, x2, y2, label in leaves: rounded(d, (x1, y1, x2, y2), label, "#F7F9FC", size=21)
    for start, end in [((385,540),(230,700)),((385,540),(640,700)),((1000,540),(1000,700)),((1000,540),(1400,700)),((1615,540),(1770,700))]: arrow(d,start,end)
    controls = "Controls: Argon2id + lockout | encrypted secure sessions | server-side RBAC | device posture | segregation of duties | immutable audit alerts"
    d.multiline_text((1000, 1010), controls, font=pil_font(23, True), fill="#1B5E20", anchor="mm", align="center")
    im.save(path)


def make_ui_wireframes(path):
    im = Image.new("RGB", (2100, 1300), "white")
    d = ImageDraw.Draw(im)
    d.text((55, 35), "Role Based Interface Wireframes", font=pil_font(42, True), fill="#17365D")
    cards = [
        (70, 150, 1000, 600, "Login", ["Email", "Password", "Sign in", "Clear error and lockout feedback"]),
        (1100, 150, 2030, 600, "Employee Dashboard", ["My devices", "Protected applications", "Request access", "Decision and risk explanation"]),
        (70, 700, 1000, 1170, "Resource Owner", ["Pending approvals", "Requester and resource", "Risk factors", "Approve / Reject / Step up"]),
        (1100, 700, 2030, 1170, "Administrator and Auditor", ["Users and roles", "Device posture", "Policies", "Searchable audit trail"]),
    ]
    for x1,y1,x2,y2,title,items in cards:
        d.rounded_rectangle((x1,y1,x2,y2), radius=18, fill="#F8FAFC", outline="#2F75B5", width=4)
        d.rectangle((x1,y1,x2,y1+75), fill="#17365D")
        d.text((x1+25,y1+18),title,font=pil_font(28,True),fill="white")
        yy=y1+115
        for item in items:
            d.rounded_rectangle((x1+40,yy,x2-40,yy+55),radius=10,fill="#FFFFFF",outline="#D9E2F3",width=2)
            d.text((x1+65,yy+13),item,font=pil_font(20),fill="#1F2937")
            yy+=72
    im.save(path)


def make_burndown(path):
    im = Image.new("RGB", (1900, 1100), "white")
    d = ImageDraw.Draw(im)
    d.text((55, 35), "Sprint Burndown Evidence", font=pil_font(42, True), fill="#17365D")
    charts = [
        (100, 170, 880, 900, "Sprint 1", 25, [25,23,18,15,10,7,3,0], "#2F75B5"),
        (1020, 170, 1800, 900, "Sprint 2", 31, [31,29,25,21,15,10,5,0], "#1B5E20"),
    ]
    for x1,y1,x2,y2,title,total,actual,color in charts:
        d.rectangle((x1,y1,x2,y2),outline="#D9E2F3",width=3)
        d.text(((x1+x2)//2,y1+35),f"{title}  {total} story points",font=pil_font(26,True),fill="#172B4D",anchor="ma")
        left=x1+90; right=x2-45; top=y1+110; bottom=y2-90
        d.line((left,top,left,bottom),fill="#6B7280",width=3); d.line((left,bottom,right,bottom),fill="#6B7280",width=3)
        ideal=[]; actual_pts=[]
        for i,val in enumerate(actual):
            xx=left+(right-left)*i/(len(actual)-1)
            ideal_val=total*(1-i/(len(actual)-1))
            ideal.append((xx,bottom-(bottom-top)*ideal_val/total))
            actual_pts.append((xx,bottom-(bottom-top)*val/total))
            d.text((xx,bottom+20),str(i+1),font=pil_font(16),fill="#4B5563",anchor="ma")
        d.line(ideal,fill="#A5ADBA",width=4); d.line(actual_pts,fill=color,width=6)
        for p in actual_pts: d.ellipse((p[0]-6,p[1]-6,p[0]+6,p[1]+6),fill=color)
        d.text((left,top-25),str(total),font=pil_font(17),fill="#4B5563",anchor="rs")
        d.text(((left+right)//2,bottom+55),"Checkpoint",font=pil_font(18),fill="#4B5563",anchor="ma")
    d.text((950,1010),"Both sprints reached zero remaining points; defects carried over: 0",font=pil_font(24,True),fill="#1B5E20",anchor="mm")
    im.save(path)


def make_pipeline(path):
    im = Image.new("RGB", (2100, 750), "white")
    d = ImageDraw.Draw(im)
    d.text((55, 35), "Secure CI CD Pipeline", font=pil_font(42, True), fill="#17365D")
    stages = ["Checkout", "Install locked\ndependencies", "Lint and\nSAST", "Unit integration\nand fuzz tests", "Production\nbuild", "Container scan\nand package", "Deploy and\nverify"]
    colors=["#E8F1FB","#EAF7F1","#FFF4E5","#F4ECF7","#E8F1FB","#FDEDEC","#EAF7F1"]
    x=45
    boxes=[]
    for stage,color in zip(stages,colors):
        box=(x,260,x+245,465); rounded(d,box,stage,color,size=21); boxes.append(box); x+=290
    for a,b in zip(boxes,boxes[1:]): arrow(d,(a[2],(a[1]+a[3])//2),(b[0],(b[1]+b[3])//2))
    d.text((1050,610),"Any failed quality or security gate stops promotion",font=pil_font(26,True),fill="#B54708",anchor="mm")
    im.save(path)


def make_deployment(path):
    im = Image.new("RGB", (2000, 1000), "white")
    d = ImageDraw.Draw(im)
    d.text((55, 35), "Container and Kubernetes Deployment", font=pil_font(42, True), fill="#17365D")
    rounded(d,(80,380,410,590),"User Browser\nHTTPS", "#E8F1FB")
    rounded(d,(540,380,900,590),"Kubernetes Service\ncontrolled exposure", "#EAF7F1")
    rounded(d,(1030,220,1500,475),"ZTAP Deployment\nnon root container\nresource limits\nhealth checks", "#FFF4E5")
    rounded(d,(1030,600,1500,850),"PostgreSQL Service\nprivate network\npersistent storage", "#F4ECF7")
    rounded(d,(1650,350,1930,650),"ConfigMap\nand Secret\nreferences", "#FDEDEC")
    arrow(d,(410,485),(540,485)); arrow(d,(900,485),(1030,350)); arrow(d,(1265,475),(1265,600)); arrow(d,(1650,500),(1500,350)); arrow(d,(1650,520),(1500,725))
    d.text((1000,925),"Namespace isolation and least privilege apply across the deployment boundary",font=pil_font(23,True),fill="#1B5E20",anchor="mm")
    im.save(path)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run()
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    run._r.append(fld)


def clean_inline(text):
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text.strip()


def add_code(doc, lines):
    if not lines: return
    p=doc.add_paragraph()
    p.paragraph_format.left_indent=Cm(0.5)
    p.paragraph_format.space_before=Pt(3); p.paragraph_format.space_after=Pt(6)
    for i,line in enumerate(lines):
        r=p.add_run(line + ("\n" if i < len(lines)-1 else ""))
        r.font.name="Consolas"; r.font.size=Pt(7.5); r.font.color.rgb=RGBColor.from_string("374151")
    pPr=p._p.get_or_add_pPr(); shd=OxmlElement("w:shd"); shd.set(qn("w:fill"),"F3F4F6"); pPr.append(shd)


def add_markdown(doc, path, skip_title=True):
    lines=path.read_text(encoding="utf-8").splitlines()
    i=0; in_code=False; code=[]; code_lang=""
    while i < len(lines):
        raw=lines[i].rstrip(); stripped=raw.strip()
        if stripped.startswith("```"):
            if not in_code:
                in_code=True; code=[]; code_lang=stripped[3:].strip().lower()
            else:
                if code_lang not in ("mermaid",): add_code(doc,code)
                in_code=False; code=[]; code_lang=""
            i+=1; continue
        if in_code:
            code.append(raw); i+=1; continue
        if not stripped or stripped == "---" or stripped.startswith("> [!"):
            i+=1; continue
        if stripped.startswith("# "):
            if not skip_title: doc.add_heading(clean_inline(stripped[2:]),1)
            i+=1; continue
        if stripped.startswith("### "):
            doc.add_heading(clean_inline(stripped[4:]),3); i+=1; continue
        if stripped.startswith("## "):
            doc.add_heading(clean_inline(stripped[3:]),2); i+=1; continue
        if stripped.startswith("|") and i+1 < len(lines) and re.match(r"^\s*\|?\s*:?-+", lines[i+1]):
            headers=[clean_inline(x) for x in stripped.strip("|").split("|")]
            i+=2; rows=[]
            while i<len(lines) and lines[i].strip().startswith("|"):
                rows.append([clean_inline(x) for x in lines[i].strip().strip("|").split("|")])
                i+=1
            widths=[max(2.0,15.5/len(headers))]*len(headers)
            add_table(doc,headers,rows,widths,font_size=7.3 if len(headers)>4 else 8.1)
            doc.add_paragraph()
            continue
        if re.match(r"^[-*] ", stripped):
            p=doc.add_paragraph(style="List Bullet"); p.add_run(clean_inline(stripped[2:])); i+=1; continue
        if re.match(r"^\d+\. ", stripped):
            p=doc.add_paragraph(style="List Number"); p.add_run(clean_inline(re.sub(r"^\d+\. ","",stripped))); i+=1; continue
        if stripped.startswith(">"):
            stripped=stripped.lstrip("> ")
        parts=[stripped]; i+=1
        while i<len(lines):
            nxt=lines[i].strip()
            if not nxt or nxt.startswith(("#","- ","* ","```","|",">")) or re.match(r"^\d+\. ",nxt): break
            parts.append(nxt); i+=1
        doc.add_paragraph(clean_inline(" ".join(parts)))


def phase_heading(doc, number, title, marks, deliverable):
    p=doc.add_paragraph(style="Title")
    p.paragraph_format.page_break_before=True
    p.add_run(f"Phase {number}  {title}")
    s=doc.add_paragraph()
    r=s.add_run(f"Marks {marks}   Deliverable  {deliverable}")
    r.bold=True; r.font.color.rgb=RGBColor.from_string(NAVY)


def add_phase9(doc):
    stories=[
        ("US-01","Authentication","Highest","5","As an employee I want to log in securely so that only authenticated users reach the portal.","Valid credentials create a secure session; invalid attempts are rejected, logged and rate limited."),
        ("US-02","Authentication","High","2","As a user I want to terminate my session so that an unattended browser cannot retain access.","Logout invalidates the session and the old cookie cannot access protected routes."),
        ("US-03","User Governance","Highest","5","As a security administrator I want to govern users and roles so that least privilege is maintained.","Authorized administrators can create, disable and assign roles; self escalation is blocked."),
        ("US-04","Device Trust","High","3","As an employee I want to register a device so that access decisions include endpoint context.","The device is linked to its owner and visible for posture assessment."),
        ("US-05","Device Trust","Highest","5","As a security administrator I want to control device posture so that compromised endpoints are denied.","Compromised or noncompliant posture causes denial and produces an audit event."),
        ("US-06","Resource Policy","High","5","As a resource owner I want to manage protected applications and policies so that access rules match business risk.","Only authorized owners or administrators can maintain resources and validated policies."),
        ("US-07","Access Request","Highest","5","As an employee I want to request access to an internal application so that I can perform authorized work.","The request includes a resource, owned device and reason and returns a persisted outcome."),
        ("US-08","Policy Engine","Highest","8","As the security system I want to evaluate every access request so that no request is trusted by network location alone.","Identity, role, device, resource, time and risk are evaluated with default denial."),
        ("US-09","Risk Engine","High","5","As an auditor I want explainable risk scores so that access decisions can be reviewed.","A 0 to 100 score, level and human readable factors are persisted for each request."),
        ("US-10","Approval","Highest","5","As a resource owner I want to approve or reject pending requests so that I remain accountable for my applications.","Only the accountable owner can decide, a reason is recorded and self approval is rejected."),
        ("US-11","Audit","High","5","As an auditor I want searchable and exportable security logs so that compliance evidence is available.","Authorized auditors can filter events without changing or exposing secret data."),
        ("US-12","Dashboards","Medium","3","As a role based user I want a focused dashboard so that I can see the work and evidence relevant to me.","Employee, owner, administrator and auditor views expose only authorized functions."),
    ]
    doc.add_heading("Product backlog",2)
    add_table(doc,["ID","Epic","Priority","SP","User story","Acceptance criteria"],stories,[1.3,2.4,1.6,0.8,5.2,5.0],6.8)
    doc.add_heading("Jira implementation",2)
    doc.add_paragraph("The ZTEAP Scrum project contains 16 phase epics and 101 total work items: 16 epics, 18 stories, 52 tasks, 12 subtasks and 3 bugs. Phase 9 is represented by epic ZTEAP-21. The 12 product stories are ZTEAP-80 through ZTEAP-102, with a verification subtask under every story.")
    doc.add_heading("Two sprint plan",2)
    add_table(doc,["Sprint","Goal","Stories","Points","Defects"],[
        ("Sprint 1 Foundation","Deliver authentication, session termination, user governance and device trust foundations.","US-01 to US-06","25","DEF-01 and DEF-02"),
        ("Sprint 2 Decisions","Deliver policy and risk decisions, approvals, dashboards and auditable evidence.","US-07 to US-12","31","DEF-03"),
    ],[2.6,6.0,2.5,1.3,3.2],8)


def add_phase10(doc, burndown):
    doc.add_heading("Scrum board and execution evidence",2)
    doc.add_paragraph("The verified Jira workflow is TO DO to IN PROGRESS to TESTING to DONE. Work items were moved through the workflow and the final project state contains 97 Done items and four legitimately In Progress items related to live deployment evidence and the final report.")
    doc.add_heading("Daily Scrum entry",2)
    add_table(doc,["Sprint day","Progress","Plan","Blockers"],[
        ("Sprint 1 Day 8","Authentication, device trust and access request flow completed.","Finish policy edge cases and automated verification.","Default policy fallback required clarification and was resolved with default deny."),
        ("Sprint 2 Day 7","Dashboards and self approval protection completed.","Finish privilege escalation tests and audit export.","RBAC edge case resolved through integration testing."),
    ],[2.3,4.8,4.8,4.2],8)
    add_picture(doc,burndown,"Figure 7 Verified sprint burndown data",width=6.7)
    doc.add_heading("Velocity and defect metrics",2)
    add_table(doc,["Sprint","Planned","Completed","Velocity","Defects","Carried over"],[
        ("Sprint 1","25 SP","25 SP","25","2 resolved","0"),
        ("Sprint 2","31 SP","31 SP","31","1 resolved","0"),
        ("Average / Total","56 SP","56 SP","28 average","3 total","0 total"),
    ],[2.6,2.3,2.3,2.3,3.2,2.4],8.2)
    doc.add_heading("Sprint review and retrospective",2)
    add_table(doc,["Sprint","Review outcome","Retrospective improvement actions"],[
        ("Sprint 1","Secure login, user governance and device trust were accepted; denial messages needed clearer explanations.","Add a security review checklist to every pull request; run security linting on every commit."),
        ("Sprint 2","Policy, risk, approval, dashboards and audit evidence were demonstrated and accepted.","Increase authorization E2E coverage; maintain a policy-rule decision table with tests."),
    ],[2.4,6.2,6.2],8)


def build():
    ASSETS.mkdir(parents=True,exist_ok=True)
    arch=ASSETS/"architecture.png"; uc=ASSETS/"use_case.png"; dfd=ASSETS/"dfd_level_1.png"; er=ASSETS/"er_diagram.png"
    make_architecture(arch); make_use_case(uc); make_dfd(dfd); make_er(er)
    level0=ASSETS/"dfd_level_0.png"; attack=ASSETS/"attack_tree.png"; ui=ASSETS/"ui_wireframes.png"; burn=ASSETS/"burndown.png"; pipe=ASSETS/"cicd_pipeline.png"; deploy=ASSETS/"deployment.png"
    make_level0(level0); make_attack_tree(attack); make_ui_wireframes(ui); make_burndown(burn); make_pipeline(pipe); make_deployment(deploy)

    old=Document(OUT) if OUT.exists() else None
    details=[p.text for p in old.paragraphs[:4]] if old and len(old.paragraphs)>=4 else ["SECURE SOFTWARE ENGINEERING LAB EXAM","20CYS401","NAME:N.ABHINAIREDDY","REGNO:CH.SC.U4CYS23029"]

    doc=Document()
    sec=doc.sections[0]; sec.top_margin=Cm(1.7); sec.bottom_margin=Cm(1.6); sec.left_margin=Cm(1.8); sec.right_margin=Cm(1.8)
    styles=doc.styles
    normal=styles["Normal"]; normal.font.name="Aptos"; normal.font.size=Pt(9.5); normal.font.color.rgb=RGBColor.from_string(TEXT); normal.paragraph_format.space_after=Pt(5); normal.paragraph_format.line_spacing=1.05
    for name,size in [("Title",24),("Subtitle",12),("Heading 1",16),("Heading 2",12.5),("Heading 3",10.5)]:
        st=styles[name]; st.font.name="Aptos Display"; st.font.size=Pt(size); st.font.color.rgb=RGBColor(0,0,0)
        if name == "Title": st.paragraph_format.page_break_before=False
        if name.startswith("Heading"): st.font.bold=True; st.paragraph_format.space_before=Pt(9); st.paragraph_format.space_after=Pt(4); st.paragraph_format.keep_with_next=True
    header=sec.header.paragraphs[0]; header.text="ZERO TRUST ENTERPRISE ACCESS PORTAL  |  16 PHASE SECURE SOFTWARE ENGINEERING REPORT"; header.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    for r in header.runs: r.font.size=Pt(7); r.font.color.rgb=RGBColor.from_string("6B7280")
    footer=sec.footer.paragraphs[0]; add_page_number(footer)

    # Preserve student details from the user's current first page.
    for idx,text in enumerate(details):
        p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before=Pt(5 if idx else 24)
        r=p.add_run(text); r.bold=True; r.font.size=Pt(16 if idx<2 else 13); r.font.color.rgb=RGBColor(0,0,0)
    doc.add_paragraph()
    p=doc.add_paragraph(style="Title"); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run("Software Requirements Specification and Secure Engineering Report")
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    r=p.add_run("Zero Trust Enterprise Access Portal"); r.bold=True; r.font.size=Pt(19); r.font.color.rgb=RGBColor.from_string(NAVY)
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run("Complete examination submission aligned with all 16 assessed phases")
    doc.add_paragraph()
    add_table(doc,["Document control","Value"],[
        ("Document ID","ZTAP SSE 001"),("Version","2.0"),("Date","8 October 2026"),
        ("Scope","Requirements, design, security engineering, Scrum, implementation, testing and deployment evidence"),
        ("Project","Zero Trust Enterprise Access Portal"),
    ],[4.2,11.5],8.8)
    doc.add_page_break()

    doc.add_heading("Executive summary",1)
    doc.add_paragraph("This report applies the complete 16 phase Secure Software Engineering laboratory workflow to one consistent system: the Zero Trust Enterprise Access Portal. The portal verifies identity, server side authorization, device posture, policy constraints and explainable risk on every access request. Each phase is derived from the preceding phase and is traceable to implementation and test evidence.")
    doc.add_heading("Assessment alignment",1)
    phase_rows=[
        (1,"Agile Process","6","Scrum with XP, principles, refactoring and mitigations"),(2,"Requirements Engineering","7","Stakeholders and prioritized SRS"),
        (3,"Requirements Analysis and UML","7","Use cases and scenario analysis"),(4,"Data and Information Flow","7","ER, DFD and trust boundaries"),
        (5,"Architecture and Design","7","Architecture, components and patterns"),(6,"User Interface Design","5","Four or more role screens and rationale"),
        (7,"Threat Modeling and Security","10","Assets, STRIDE, information flow and vulnerabilities"),(8,"Attack Tree and Refinement","6","Attack tree and refined controls"),
        (9,"Product Backlog and Jira","7","12 stories, Jira hierarchy and two sprint plans"),(10,"Sprint Execution and Metrics","7","Workflow, Scrum, burndown, velocity and review"),
        (11,"Secure Development","6","Repository, secrets, dependencies and SAST"),(12,"Secure Coding and Refactoring","4","Modules, fixes and secure handling"),
        (13,"Docker and Kubernetes","7","Container and orchestration security"),(14,"CI CD and Security Testing","7","Pipeline, tests, fuzzing and defects"),
        (15,"Logging Monitoring and Hardening","5","Events, alerts, hardening and deployment"),(16,"Final Security Review","1","End to end traceability and remaining risks"),
    ]
    add_table(doc,["Phase","Activity","Marks","Evidence in this report"],phase_rows,[1.2,4.2,1.3,9.0],7.4)
    doc.add_heading("Contents",1)
    add_bullets(doc,[f"Phase {n}  {title}" for n,title,_,_ in phase_rows]+["Appendices  Tools technologies and verification summary"])

    phase_heading(doc,1,"Agile Process and Development Approach",6,"Agile approach, Manifesto mapping, refactoring evidence and risk mitigations")
    add_markdown(doc,DOCS/"phase-01-agile.md")

    phase_heading(doc,2,"Requirements Engineering",7,"Stakeholders and concise functional, nonfunctional and security requirements")
    add_markdown(doc,DOCS/"phase-02-requirements.md")

    phase_heading(doc,3,"Requirements Analysis and UML",7,"Use case diagram, two specifications and scenario analysis")
    add_picture(doc,uc,"Figure 1 UML use case diagram",width=6.6)
    add_markdown(doc,DOCS/"phase-03-uml.md")

    phase_heading(doc,4,"Data and Information Flow Modeling",7,"ER diagram and Level 0 and Level 1 DFD with trust boundaries")
    add_picture(doc,er,"Figure 2 Entity relationship diagram",width=6.6)
    add_picture(doc,level0,"Figure 3 Data flow diagram Level 0",width=6.5)
    add_picture(doc,dfd,"Figure 4 Data flow diagram Level 1",width=6.6)
    add_markdown(doc,DOCS/"phase-04-data-flow.md")

    phase_heading(doc,5,"Software Architecture and Design Engineering",7,"Architecture diagram, component design and justification")
    add_picture(doc,arch,"Figure 5 Zero Trust layered project architecture",width=6.7)
    add_markdown(doc,DOCS/"phase-05-architecture.md")

    phase_heading(doc,6,"User Interface Design",5,"Role based wireframes and design rationale")
    add_picture(doc,ui,"Figure 6 Login, employee, owner, administrator and auditor wireframes",width=6.7)
    add_markdown(doc,DOCS/"phase-06-ui.md")

    phase_heading(doc,7,"Threat Modeling and Security Analysis",10,"Asset CIA, STRIDE, information flow and vulnerability analysis")
    doc.add_heading("Threat model and STRIDE",2); add_markdown(doc,DOCS/"phase-07-threat-model.md")
    doc.add_heading("Information flow analysis",2); add_markdown(doc,DOCS/"phase-08-information-flow.md")
    doc.add_heading("Vulnerability analysis",2); add_markdown(doc,DOCS/"phase-09-vulnerability.md")

    phase_heading(doc,8,"Attack Tree and Security Architecture Refinement",6,"Attack tree, attack paths, controls and refined architecture")
    add_picture(doc,attack,"Figure 7 Attack tree with preventive and detective controls",width=6.7)
    add_markdown(doc,DOCS/"phase-10-attack-tree.md")

    phase_heading(doc,9,"Product Backlog and Jira Scrum",7,"Product backlog, Jira project and two sprint plans")
    add_phase9(doc)

    phase_heading(doc,10,"Sprint Execution and Scrum Metrics",7,"Board, Daily Scrum, burndown, velocity, defects, review and retrospective")
    add_phase10(doc,burn)

    phase_heading(doc,11,"Secure Development and Build Environment",6,"Repository controls, secure build checklist and security check result")
    add_markdown(doc,DOCS/"phase-13-secure-development.md")

    phase_heading(doc,12,"Secure Coding and Refactoring",4,"Source code, before and after evidence and security justification")
    add_markdown(doc,DOCS/"phase-14-secure-coding.md")

    phase_heading(doc,13,"Containerized Development with Docker and Kubernetes",7,"Dockerfile, manifests and deployment security evidence")
    add_picture(doc,deploy,"Figure 8 Docker and Kubernetes deployment architecture",width=6.6)
    doc.add_heading("Docker",2); add_markdown(doc,DOCS/"phase-15-docker.md")
    doc.add_heading("Kubernetes and Minikube",2); add_markdown(doc,DOCS/"phase-16-kubernetes.md")

    phase_heading(doc,14,"CI CD and Security Testing",7,"Pipeline, automated tests, fuzzing, defect and retest evidence")
    add_picture(doc,pipe,"Figure 9 Secure CI CD pipeline and quality gates",width=6.7)
    doc.add_heading("Pipeline",2); add_markdown(doc,DOCS/"phase-17-cicd-testing.md")
    doc.add_heading("Automated security and fuzz testing",2); add_markdown(doc,DOCS/"phase-18-security-testing.md")
    doc.add_heading("Verified execution result",2)
    doc.add_paragraph("The final local verification completed five test files and 21 tests successfully. The optimized Next.js production build compiled, type checked and generated all application routes successfully. Three build defects were recorded in Jira and retested as Done.")

    phase_heading(doc,15,"Logging Monitoring Hardening and Secure Deployment",5,"Monitoring plan, hardening checklist and deployment controls")
    doc.add_heading("Logging and monitoring",2); add_markdown(doc,DOCS/"phase-19-monitoring.md")
    doc.add_heading("Hardening and secure deployment",2); add_markdown(doc,DOCS/"phase-20-hardening.md")

    phase_heading(doc,16,"Final Security Review",1,"Traceability, highest risks, limitations and final observations")
    add_markdown(doc,DOCS/"phase-21-final-review.md")
    doc.add_heading("Final observation",2)
    doc.add_paragraph("The project demonstrates a coherent secure software lifecycle from requirements to deployment controls. The strongest evidence is the consistency between the server side RBAC and zero trust decision design, the Jira product backlog, the implemented modules and the passing automated tests. Production use still requires federated identity, hardware backed device attestation and independently protected external audit retention.")

    doc.add_page_break(); doc.add_heading("Appendix A Tools and technologies",1)
    add_table(doc,["Category","Tools and technologies"],[
        ("Planning and documentation","Jira Software, Microsoft Word, Draw.io"),
        ("Development","Visual Studio Code, Node.js, npm, Next.js, React, TypeScript, Tailwind CSS"),
        ("Data and validation","PostgreSQL, Prisma ORM, Zod"),
        ("Testing and security","Vitest, Playwright, ESLint, Trivy, OWASP ZAP, Postman"),
        ("Delivery","Git, GitHub, GitHub Actions, Docker, Docker Compose, Kubernetes, Minikube"),
        ("Automation","PowerShell"),
    ],[4.0,11.7],8.5)
    doc.add_heading("Appendix B Verification summary",1)
    add_table(doc,["Area","Verified result"],[
        ("Jira","101 work items; 16 phase epics; 97 Done; 4 In Progress"),
        ("Product backlog","12 assessed user stories with priority, points, acceptance criteria and child verification tasks"),
        ("Scrum","Two closed sprints; 56 completed story points; three resolved defects; zero defect carry over"),
        ("Automated tests","5 test files and 21 tests passed"),
        ("Production build","Next.js optimized build completed successfully"),
        ("Document alignment","All 16 examination phases explicitly represented in rubric order"),
    ],[4.0,11.7],8.5)

    for p in doc.paragraphs:
        if p.style.name.startswith("Heading"): keep_with_next(p)
        for r in p.runs:
            if not r.font.name: r.font.name="Aptos"
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
