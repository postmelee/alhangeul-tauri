//! Pure test acceptance policy. This is not a product authorization boundary.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Application,
    SystemConsoleHost,
    ConsoleHost,
    OpenConsole,
    WebView,
    ThumbnailWorker,
    Other,
    Unavailable,
}

#[derive(Debug, Default)]
pub struct Evidence {
    pub root_pid: u32,
    pub seen: Vec<(u32, Role)>,
    pub failed_samples: u32,
    pub capacity_reached: bool,
}

impl Evidence {
    pub fn accepts(&self, lifetime_count: u32, debug: bool) -> bool {
        if self.root_pid == 0
            || self.failed_samples != 0
            || self.capacity_reached
            || self.seen.len() != lifetime_count as usize
            || !matches!(lifetime_count, 1 | 2)
        {
            return false;
        }
        let (mut applications, mut consoles) = (0, 0);
        for (index, &(pid, role)) in self.seen.iter().enumerate() {
            if pid == 0 || self.seen[..index].iter().any(|(prior, _)| *prior == pid) {
                return false;
            }
            match role {
                Role::Application if pid == self.root_pid => applications += 1,
                Role::SystemConsoleHost if debug && pid != self.root_pid => consoles += 1,
                _ => return false,
            }
        }
        applications == 1 && consoles <= 1
    }
}

#[test]
fn only_debug_can_include_one_verified_system_console() {
    let mut evidence = Evidence {
        root_pid: 1,
        seen: vec![(1, Role::Application)],
        ..Default::default()
    };
    assert!(evidence.accepts(1, false));
    assert!(evidence.accepts(1, true));
    evidence.seen.push((2, Role::SystemConsoleHost));
    assert!(evidence.accepts(2, true));
    assert!(!evidence.accepts(2, false));
}

#[test]
fn basename_only_and_unexpected_processes_are_not_console_exceptions() {
    for role in [
        Role::ConsoleHost,
        Role::OpenConsole,
        Role::WebView,
        Role::ThumbnailWorker,
        Role::Other,
        Role::Unavailable,
        Role::Application,
    ] {
        let evidence = Evidence {
            root_pid: 1,
            seen: vec![(1, Role::Application), (2, role)],
            ..Default::default()
        };
        assert!(!evidence.accepts(2, true), "{role:?}");
    }
}

#[test]
fn incomplete_or_ambiguous_lifetime_evidence_cannot_pass() {
    let mut evidence = Evidence {
        root_pid: 1,
        seen: vec![(1, Role::Application), (2, Role::SystemConsoleHost)],
        ..Default::default()
    };
    for total in [0, 1, 3, u32::MAX] {
        assert!(!evidence.accepts(total, true));
    }
    evidence.failed_samples = 1;
    assert!(!evidence.accepts(2, true));
    evidence.failed_samples = 0;
    evidence.capacity_reached = true;
    assert!(!evidence.accepts(2, true));
    evidence.capacity_reached = false;
    for root in [0, 2, 3] {
        evidence.root_pid = root;
        assert!(!evidence.accepts(2, true));
    }
    evidence.root_pid = 1;
    for pid in [0, 1] {
        evidence.seen[1].0 = pid;
        assert!(!evidence.accepts(2, true));
    }
    evidence.seen = vec![
        (1, Role::Application),
        (2, Role::SystemConsoleHost),
        (3, Role::SystemConsoleHost),
    ];
    assert!(!evidence.accepts(3, true));
    evidence.seen = vec![(1, Role::SystemConsoleHost)];
    assert!(!evidence.accepts(1, true));
}
