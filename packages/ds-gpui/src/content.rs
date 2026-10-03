//! Retained native content recipes; elements are recreated for each frame.
use gpui::{AnyElement, AnyView, App, Entity, IntoElement, Render, SharedString, Window};
use std::{collections::HashSet, rc::Rc};

/// Retain a view for stateful components. Factories build fresh frame elements;
/// creating a new entity inside a factory does not provide retained identity.
#[derive(Clone, Default)]
pub enum NativeContent {
    #[default]
    Empty,
    Text(SharedString),
    View(AnyView),
    Group(Vec<NativeContent>),
    Factory(Rc<dyn Fn(&mut Window, &mut App) -> AnyElement>),
}

impl NativeContent {
    pub fn text(text: impl Into<SharedString>) -> Self { Self::Text(text.into()) }
    pub fn view<V: Render>(view: Entity<V>) -> Self { Self::View(view.into()) }
    pub fn group(content: impl IntoIterator<Item = NativeContent>) -> Self { Self::Group(content.into_iter().collect()) }
    pub fn factory<E: IntoElement>(factory: impl Fn(&mut Window, &mut App) -> E + 'static) -> Self {
        Self::Factory(Rc::new(move |window, cx| factory(window, cx).into_any_element()))
    }
    /// Recipe presence never executes a factory or renders a view.
    pub fn is_present(&self) -> bool {
        match self {
            Self::Empty => false,
            Self::Text(text) => !text.is_empty(),
            Self::View(_) | Self::Factory(_) => true,
            Self::Group(content) => content.iter().any(Self::is_present),
        }
    }
    /// Reject the same retained entity in multiple supplied positions. This is
    /// conservative across hidden regions. Views returned by factories are the
    /// consumer's responsibility because presence does not execute factories.
    pub fn assert_unique_views<'a>(content: impl IntoIterator<Item = &'a Self>) {
        fn visit(content: &NativeContent, ids: &mut HashSet<gpui::EntityId>) {
            match content {
                NativeContent::View(view) => assert!(ids.insert(view.entity_id()), "FSDS_DUPLICATE_NATIVE_VIEW_PLACEMENT"),
                NativeContent::Group(group) => for child in group { visit(child, ids); },
                _ => (),
            }
        }
        let mut ids = HashSet::new();
        for child in content { visit(child, &mut ids); }
    }
    /// Flatten groups in authored order, without adding layout wrappers.
    pub fn render(&self, window: &mut Window, cx: &mut App) -> Vec<AnyElement> {
        Self::assert_unique_views([self]);
        self.render_frame(window, cx)
    }
    fn render_frame(&self, window: &mut Window, cx: &mut App) -> Vec<AnyElement> {
        match self {
            Self::Empty => Vec::new(),
            Self::Text(text) if text.is_empty() => Vec::new(),
            Self::Text(text) => vec![text.clone().into_any_element()],
            Self::View(view) => vec![view.clone().into_any_element()],
            Self::Group(content) => content.iter().flat_map(|child| child.render_frame(window, cx)).collect(),
            Self::Factory(factory) => vec![factory(window, cx)],
        }
    }
}
impl From<SharedString> for NativeContent { fn from(text: SharedString) -> Self { Self::Text(text) } }
impl From<&'static str> for NativeContent { fn from(text: &'static str) -> Self { Self::text(text) } }
impl From<String> for NativeContent { fn from(text: String) -> Self { Self::text(text) } }
impl<V: Render> From<Entity<V>> for NativeContent { fn from(view: Entity<V>) -> Self { Self::view(view) } }
impl From<AnyView> for NativeContent { fn from(view: AnyView) -> Self { Self::View(view) } }
