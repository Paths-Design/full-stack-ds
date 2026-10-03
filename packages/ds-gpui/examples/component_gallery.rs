//! A real owner-controlled GPUI consumer. It exercises generated views, not a parallel UI.
use full_stack_ds_gpui::components::{Badge, Checkbox, Divider, Stat, Switch, Text, ToggleSwitch};
use full_stack_ds_gpui::content::NativeContent;
use full_stack_ds_gpui::control::ChangeRequest;
use full_stack_ds_gpui::style::Theme;
use gpui::{prelude::*, actions, div, px, size, App, Bounds, Context, Entity, FocusHandle, KeyBinding, Subscription, Window, WindowBounds, WindowOptions};

struct RendererDiagnostics { font_count: usize, dilation: [u8; 3], text: std::sync::Arc<dyn gpui::PlatformTextSystem> }
impl gpui::Global for RendererDiagnostics {}

actions!(fsds_gallery, [Tab, BackTab]);

struct Gallery {
    focus: FocusHandle,
    switches: Vec<Entity<Switch>>,
    toggles: Vec<Entity<ToggleSwitch>>,
    checkboxes: Vec<Entity<Checkbox>>,
    text: Vec<Entity<Text>>,
    badges: Vec<Entity<Badge>>,
    divider: Entity<Divider>,
    vertical: Entity<Divider>,
    composed: Entity<Text>,
    nested_switch: Entity<Switch>,
    stats: Vec<Entity<Stat>>,
    composition_updates: usize,
    composed_requests: usize,
    accepted: usize,
    last_request: String,
    last_render_metrics: String,
    _subscriptions: Vec<Subscription>,
}

impl Gallery {
    fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let focus = cx.focus_handle();
        window.focus(&focus, cx);
        let mut switches = Vec::new();
        for size in ["sm", "md", "lg"] {
            for checked in [false, true] {
                switches.push(cx.new(|_| {
                    let mut control = Switch::default().size(size).default_checked(checked);
                    control.label = format!("{size} / {}", if checked { "on" } else { "off" }).into();
                    control
                }));
            }
        }
        switches.push(cx.new(|_| {
            let mut control = Switch::default().default_checked(true).disabled(true);
            control.label = "Disabled / on".into(); control
        }));
        switches.push(cx.new(|_| {
            let mut control = Switch::default().default_checked(true);
            control.theme = Theme::default().with_token("switch.design.track.background.fill", "#108850");
            control.label = "Per-instance track token override".into(); control
        }));
        let mut toggles = Vec::new();
        for checked in [false, true] {
            toggles.push(cx.new(|_| {
                let mut control = ToggleSwitch::default().default_checked(checked);
                control.label = if checked { "Selected" } else { "Unselected" }.into(); control
            }));
        }
        toggles.push(cx.new(|_| {
            let mut control = ToggleSwitch::default().default_checked(true).disabled(true);
            control.label = "Disabled".into(); control
        }));
        let mut checkboxes = Vec::new();
        for (label, checked, indeterminate, disabled) in [
            ("Unchecked", false, false, false), ("Checked", true, false, false),
            ("Mixed", false, true, false), ("Mixed + checked", true, true, false),
            ("Disabled unchecked", false, false, true), ("Disabled checked", true, false, true),
        ] {
            checkboxes.push(cx.new(|_| {
                let mut control = Checkbox::default().default_checked(checked).indeterminate(indeterminate).disabled(disabled);
                control.label = label.into(); control
            }));
        }
        let owner_switch = cx.new(|_| {
            let mut control = Switch::default().checked(Some(false));
            control.label = "Owner accepts requests".into(); control
        });
        let owner_refuses = cx.new(|_| {
            let mut control = Switch::default().checked(Some(false));
            control.label = "Owner refuses requests".into(); control
        });
        let accept = cx.subscribe(&owner_switch, |this, entity, request: &ChangeRequest, cx| {
            this.accepted += 1;
            this.last_request = format!("Accepted {} = {}", request.channel, request.value);
            entity.update(cx, |control, cx| control.set_checked(Some(request.value), cx));
            cx.notify();
        });
        let refuse = cx.subscribe(&owner_refuses, |this, _, request: &ChangeRequest, cx| {
            this.last_request = format!("Refused {} = {} (owner stays off)", request.channel, request.value);
            cx.notify();
        });
        switches.extend([owner_switch, owner_refuses]);
        let text = [
            ("headline", "Generated native components"),
            ("body", "Pointer, Space and Tab use the generated control event path."),
            ("caption", "Switch and Checkbox: Space. ToggleSwitch: Space or Enter."),
            ("code", "fn render(&mut self, window, cx) -> impl IntoElement"),
        ].into_iter().map(|(variant, label)| cx.new(|_| {
            let mut text = Text::default().variant(variant);
            text.label = label.into(); text
        })).collect();
        let badges = ["info", "success", "warning", "danger"].into_iter().map(|intent| cx.new(|_| {
            let mut badge = Badge::default().intent(intent);
            badge.label = intent.into(); badge
        })).collect();
        let divider = cx.new(|_| Divider::default());
        let vertical = cx.new(|_| Divider::default().orientation("vertical"));
        let nested_switch=cx.new(|_|Switch::default().checked(Some(false)).label("Retained nested Switch"));
        let composed=cx.new(|_|Text::default().content(NativeContent::group([
            NativeContent::text("Generated Text contains a working child: "),
            NativeContent::view(nested_switch.clone()),
        ])));
        let nested_owner=cx.subscribe(&nested_switch,|this,entity,request:&ChangeRequest,cx|{
            this.composed_requests+=1;
            entity.update(cx,|control,cx|control.set_checked(Some(request.value),cx));
            cx.notify();
        });
        let stats=[("sm","neutral","104"),("md","up","+12%"),("lg","down","−3%")].into_iter().map(|(size,trend,value)|cx.new(|_|Stat::default().size(size).trend(trend).content(NativeContent::text(value)))).collect();
        Self { focus, switches, toggles, checkboxes, text, badges, divider, vertical, composed, nested_switch, stats, composition_updates:0, composed_requests:0, accepted: 0, last_request: "No owner request yet".into(), last_render_metrics: String::new(), _subscriptions: vec![accept, refuse, nested_owner] }
    }
}

impl Render for Gallery {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let surface = render_metrics(window);
        let diagnostics = cx.global::<RendererDiagnostics>();
        let metrics = format!("{},\"font_count\":{},\"glyph_dilation_black_gray_white\":{:?},\"native_glyph_samples\":{}}}\n", surface.trim_end().trim_end_matches('}'), diagnostics.font_count, diagnostics.dilation, glyph_samples(diagnostics.text.as_ref(), window.scale_factor(), diagnostics.dilation[2]));
        if metrics != self.last_render_metrics {
            self.last_render_metrics = metrics.clone();
            if let Ok(executable) = std::env::current_exe() {
                if let Some(contents) = executable.parent().and_then(|directory| directory.parent()) {
                    if let Err(error) = std::fs::write(contents.join("render-metrics.json"), &metrics) {
                        eprintln!("Could not save gallery render metrics: {error}");
                    }
                }
            }
        }
        div().id("gallery").track_focus(&self.focus).size_full().overflow_y_scroll()
            .bg(gpui::rgb(0xfafafa)).text_color(gpui::rgb(0x141414))
            .on_action(cx.listener(|_, _: &Tab, window, cx| window.focus_next(cx)))
            .on_action(cx.listener(|_, _: &BackTab, window, cx| window.focus_prev(cx)))
            .child(div().w_full().p_6().flex().flex_col().gap_3()
            .children(self.text.iter().cloned())
            .child(self.divider.clone())
            .child(div().flex().items_start().gap_4()
                .child(div().flex().flex_col().gap_2().child("Switch / contract size and state").children(self.switches.iter().cloned()))
                .child(self.vertical.clone())
                .child(div().flex().flex_col().gap_2().child("Checkbox / mixed and disabled").children(self.checkboxes.iter().cloned()))
                .child(div().flex().flex_col().gap_2().child("ToggleSwitch / selected pills").children(self.toggles.iter().cloned())))
            .child(div().flex().items_start().gap_2().children(self.badges.iter().cloned()))
            .child(format!("{} accepted request(s). {}", self.accepted, self.last_request))
            .child(div().flex().flex_col().gap_2().border_1().border_color(gpui::rgb(0xb8b8b8)).p_3()
                .child("Retained composition / generated Text and Stat")
                .child(self.composed.clone())
                .child(div().id("composition-redraw").cursor_pointer().p_2().rounded_md().bg(gpui::rgb(0xe0e6ff)).child("Change parent style; keep the nested control")
                    .on_click(cx.listener(|this,_,_,cx|{
                        this.composition_updates+=1;
                        let updates=this.composition_updates;
                        this.composed.update(cx,|text,cx|{
                            text.set_variant(if updates%2==0 {"body"}else{"caption"},cx);
                            text.set_theme(Theme::default().with_token("text.design.root.foreground.color",if updates%2==0 {"#141414"}else{"#108850"}),cx);
                        });cx.notify();
                    })))
                .child(format!("{} parent style changes; {} nested request(s); checked = {}",self.composition_updates,self.composed_requests,self.nested_switch.read(cx).state.value()))
                .child(div().flex().items_start().gap_4().children(self.stats.iter().cloned())))
            .child(div().text_sm().child(format!("Renderer comparison: GPUI a38fc8c at {} device pixel(s) per logical pixel", window.scale_factor())))
            .child(div().flex().flex_col().gap_2().children([false, true].into_iter().map(|dark| {
                div().relative().w_full().h(px(74.)).children([0., 0.125, 0.25, 0.375].into_iter().enumerate().map(move |(index, fraction)| {
                    div().absolute().left(px(index as f32 * 226. + fraction)).top(px(fraction)).w(px(210.)).h(px(72.))
                        .border_1().border_color(gpui::rgb(0xb8b8b8)).rounded(px(12.))
                        .bg(gpui::rgb(if dark { 0x202124 } else { 0xfafafa }))
                        .text_color(gpui::rgb(if dark { 0xffffff } else { 0x161616 }))
                        .p_3().text_size(px(16.)).child(format!("Plain GPUI / +{fraction}px")).child("Ágj / crisp baselines")
                }))
            }))))
    }
}

// Read the actual macOS surface instead of inferring backing resolution from a screenshot.
#[cfg(target_os = "macos")]
fn render_metrics(window: &Window) -> String {
    use cocoa::{base::id, foundation::{NSRect, NSSize}};
    use objc::{msg_send, sel, sel_impl};
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    let scale = window.scale_factor();
    let viewport = window.viewport_size();
    if let Ok(handle) = HasWindowHandle::window_handle(window) {
        if let RawWindowHandle::AppKit(handle) = handle.as_raw() {
            // GPUI owns this live NSView for the lifetime of Window. All messages are reads.
            unsafe {
                let view = handle.ns_view.as_ptr() as id;
                let native_window: id = msg_send![view, window];
                let native_scale: f64 = msg_send![native_window, backingScaleFactor];
                let view_bounds: NSRect = msg_send![view, bounds];
                let layer: id = msg_send![view, layer];
                let layer_scale: f64 = msg_send![layer, contentsScale];
                let drawable: NSSize = msg_send![layer, drawableSize];
                return format!("{{\"gpui_scale\":{scale},\"window_backing_scale\":{native_scale},\"layer_contents_scale\":{layer_scale},\"viewport_width\":{},\"viewport_height\":{},\"view_width\":{},\"view_height\":{},\"drawable_width\":{},\"drawable_height\":{}}}\n", f32::from(viewport.width), f32::from(viewport.height), view_bounds.size.width, view_bounds.size.height, drawable.width, drawable.height);
            }
        }
    }
    format!("{{\"gpui_scale\":{scale},\"native_surface_unavailable\":true}}\n")
}

#[cfg(not(target_os = "macos"))]
fn render_metrics(window: &Window) -> String {
    format!("{{\"gpui_scale\":{},\"native_surface_unavailable\":true}}\n", window.scale_factor())
}

fn glyph_samples(text: &dyn gpui::PlatformTextSystem, scale: f32, white_dilation: u8) -> String {
    let font_id = text.font_id(&gpui::Font::default()).expect("native system font");
    let mut samples = Vec::new();
    for font_size in [16., 32.] {
        for ch in ['Á', 'g', 'M'] {
            for dilation in [0, white_dilation] {
                for x in [0, 3] {
                    let params = gpui::RenderGlyphParams { font_id, glyph_id: text.glyph_for_char(font_id, ch).expect("native specimen glyph"), font_size: px(font_size), subpixel_variant: gpui::point(x, 0), scale_factor: scale, is_emoji: false, subpixel_rendering: false, dilation };
                    let bounds = text.glyph_raster_bounds(&params).expect("native raster bounds");
                    let (size, bitmap) = text.rasterize_glyph(&params, bounds).expect("native raster bitmap");
                    let ink = bitmap.iter().filter(|byte| **byte > 0).count();
                    assert!(size.width.0 > 0 && size.height.0 > 0 && ink > 0, "native glyph must have coverage");
                    assert_eq!(bitmap.len(), (size.width.0 * size.height.0) as usize, "grayscale raster buffer must match its returned dimensions");
                    samples.push(format!("{{\"char\":\"{ch}\",\"font_size\":{font_size},\"dilation\":{dilation},\"x_variant\":{x},\"width\":{},\"height\":{},\"ink_pixels\":{ink}}}", size.width.0, size.height.0));
                }
            }
        }
    }
    format!("[{}]", samples.join(","))
}

fn main() {
    let platform = gpui_platform::current_platform(false);
    let native_text = platform.text_system();
    let diagnostics = RendererDiagnostics {
        font_count: native_text.all_font_names().len(),
        dilation: [0x000000, 0x808080, 0xffffff].map(|color| native_text.glyph_dilation_for_color(gpui::rgb(color).into())),
        text: native_text,
    };
    assert!(diagnostics.font_count > 0, "The native gallery requires a real font backend");
    gpui::Application::with_platform(platform).run(move |cx: &mut App| {
        cx.set_global(diagnostics);
        cx.bind_keys([KeyBinding::new("tab", Tab, None), KeyBinding::new("shift-tab", BackTab, None)]);
        let bounds = Bounds::centered(None, size(px(1120.), px(760.)), cx);
        cx.open_window(WindowOptions { window_bounds: Some(WindowBounds::Windowed(bounds)), titlebar: Some(gpui::TitlebarOptions { title: Some("Full Stack DS GPUI".into()), ..Default::default() }), ..Default::default() }, |window, cx| cx.new(|cx| Gallery::new(window, cx))).expect("GPUI gallery window creation");
        cx.activate(true);
    });
}
