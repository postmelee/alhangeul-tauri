use tauri::WebviewWindow;

#[cfg(target_os = "linux")]
pub async fn print_current_webview(window: WebviewWindow) -> Result<(), String> {
    print_linux_webview(window).await
}

#[cfg(not(target_os = "linux"))]
pub async fn print_current_webview(window: WebviewWindow) -> Result<(), String> {
    window
        .print()
        .map_err(|error| format!("시스템 인쇄 UI를 열 수 없습니다: {error}"))
}

#[cfg(target_os = "linux")]
async fn print_linux_webview(window: WebviewWindow) -> Result<(), String> {
    use futures_channel::oneshot;
    use std::{cell::RefCell, rc::Rc};
    use webkit2gtk::{PrintOperation, PrintOperationExt, PrintOperationResponse};

    let (completion_tx, completion_rx) = oneshot::channel::<Result<(), String>>();
    window
        .with_webview(move |platform_webview| {
            let operation = PrintOperation::new(&platform_webview.inner());
            let completion = Rc::new(RefCell::new(Some(completion_tx)));
            let failure = Rc::new(RefCell::new(None::<String>));
            // `run_dialog` returns when the dialog closes, before WebKit finishes
            // painting and spooling. Retain the operation until `finished` so the
            // frontend keeps its temporary print surface alive for the whole job.
            let keepalive = Rc::new(RefCell::new(Some(operation.clone())));

            let failure_for_signal = Rc::clone(&failure);
            operation.connect_failed(move |_, error| {
                *failure_for_signal.borrow_mut() = Some(error.to_string());
            });

            let completion_for_signal = Rc::clone(&completion);
            let failure_for_signal = Rc::clone(&failure);
            let keepalive_for_signal = Rc::clone(&keepalive);
            operation.connect_finished(move |_| {
                let result = failure_for_signal
                    .borrow_mut()
                    .take()
                    .map_or(Ok(()), |error| Err(format!("시스템 인쇄 실패: {error}")));
                if let Some(sender) = completion_for_signal.borrow_mut().take() {
                    let _ = sender.send(result);
                }
                keepalive_for_signal.borrow_mut().take();
            });

            match operation.run_dialog(None::<&gtk::Window>) {
                PrintOperationResponse::Print => {}
                PrintOperationResponse::Cancel => {
                    if let Some(sender) = completion.borrow_mut().take() {
                        let _ = sender.send(Ok(()));
                    }
                    keepalive.borrow_mut().take();
                }
                response => {
                    if let Some(sender) = completion.borrow_mut().take() {
                        let _ =
                            sender.send(Err(format!("알 수 없는 시스템 인쇄 응답: {response:?}")));
                    }
                    keepalive.borrow_mut().take();
                }
            }
        })
        .map_err(|error| format!("시스템 인쇄 UI를 열 수 없습니다: {error}"))?;

    completion_rx
        .await
        .map_err(|_| "시스템 인쇄 완료 신호를 받지 못했습니다".to_string())?
}
