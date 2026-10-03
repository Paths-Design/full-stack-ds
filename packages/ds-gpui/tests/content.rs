//! Retained recipe witnesses in GPUI's mounted layout engine.
use full_stack_ds_gpui::{components::Switch, content::NativeContent};
use gpui::{prelude::*, div, px, AppContext, Context, Render, TestAppContext, Window};
use std::{cell::Cell, rc::Rc};

struct Host { content: NativeContent, padding: f32, renders: Rc<Cell<usize>> }
impl Render for Host {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.renders.set(self.renders.get()+1);
        div().flex().flex_col().items_start().p(px(self.padding)).children(self.content.render(window,cx))
    }
}

#[gpui::test]
fn retained_content_presence_group_order_and_fresh_factories(cx: &mut TestAppContext) {
    let calls=Rc::new(Cell::new(0)); let observed=calls.clone();
    let factory=NativeContent::factory(move |_,_| {observed.set(observed.get()+1);div().w(px(19.)).h(px(7.)).debug_selector(||"content-last".into())});
    assert!(!NativeContent::Empty.is_present()); assert!(!NativeContent::text("").is_present());
    assert!(NativeContent::text(" ").is_present()); assert!(!NativeContent::group([]).is_present());
    assert!(!NativeContent::group([NativeContent::Empty,NativeContent::group([NativeContent::text("")])]).is_present());
    assert!(factory.is_present()); assert_eq!(calls.get(),0,"presence cannot execute factories");
    let content=NativeContent::group([
        NativeContent::factory(|_,_| div().w(px(11.)).h(px(5.)).debug_selector(||"content-first".into())),
        NativeContent::Empty,
        NativeContent::group([NativeContent::text(""),NativeContent::factory(|_,_|div().w(px(13.)).h(px(6.)).debug_selector(||"content-middle".into())),factory]),
    ]);
    let renders=Rc::new(Cell::new(0));
    let (host,cx)=cx.add_window_view(|_,_|Host{content,padding:0.,renders:renders.clone()});
    for padding in [0.,8.,16.] {
        let previous=calls.get(); host.update(cx,|host,cx|{host.padding=padding;cx.notify();});cx.run_until_parked();
        assert!(calls.get()>previous);assert_eq!(calls.get(),renders.get());
        let first=cx.debug_bounds("content-first").unwrap();let middle=cx.debug_bounds("content-middle").unwrap();let last=cx.debug_bounds("content-last").unwrap();
        assert_eq!(first.size.width,px(11.));assert_eq!(middle.size.width,px(13.));assert_eq!(last.size.width,px(19.));
        assert_eq!(middle.top(),first.bottom());assert_eq!(last.top(),middle.bottom());assert_eq!(first.left(),px(padding));
    }
}

#[gpui::test]
fn retained_content_duplicate_entities_are_rejected_without_running_factories(cx: &mut TestAppContext) {
    let entity=cx.new(|_|Switch::default());
    let content=NativeContent::view(entity.clone());
    let duplicate=NativeContent::group([content.clone(),NativeContent::group([NativeContent::view(entity)])]);
    let failure=std::panic::catch_unwind(std::panic::AssertUnwindSafe(||NativeContent::assert_unique_views([&duplicate])));
    assert!(failure.is_err(),"a retained view cannot have two supplied placements");
    NativeContent::assert_unique_views([&content]);
}
