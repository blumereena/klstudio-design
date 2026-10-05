(function () {
	'use strict';

	var FEEDBACK_HOST = '';
	var FEEDBACK_PATH = '/api/feedback';
	var FEEDBACK_TIMEOUT = 10000;
	var FEEDBACK_DELAY = 600;

	var SUCCESS_NOTICE = 'Ваша заявка успешно отправлена!';
	var ERROR_NOTICE = 'Не удалось отправить заявку. Позвоните по телефону <a href="tel:+79817405783">+7 981 740-57-83</a> или напишите на <a href="mailto:info@klstudio.design">info@klstudio.design</a>.';

	var NAME_FIELD = 'input-text-name';
	var EMAIL_FIELD = 'input-email';
	var PHONE_FIELD = 'input-phone';
	var MESSAGE_FIELD = 'input-textarea';
	var TRAP_FIELD = 'feedback-trap';
	var STARTED_FIELD = 'feedback-started-at';

	function endpoint() {
		if (!FEEDBACK_HOST) {
			return '';
		}

		return FEEDBACK_HOST.replace(/\/+$/, '') + FEEDBACK_PATH;
	}

	function fieldOf(input) {
		return input.closest('.guten-form-input');
	}

	function inputOf(form, name) {
		return form.querySelector('[name="' + name + '"]');
	}

	function valueOf(form, name) {
		var input = inputOf(form, name);

		return input ? input.value.trim() : '';
	}

	function consentBox(form) {
		return form.querySelector('.gutenverse-input-checkbox');
	}

	function submitButton(form) {
		return form.querySelector('.gutenverse-input-submit');
	}

	function isFilled(input) {
		if (input.type === 'checkbox') {
			return input.checked;
		}

		return input.value.trim() !== '';
	}

	function isValid(input) {
		if (!isFilled(input)) {
			return false;
		}

		return input.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
	}

	function syncSubmitState(form) {
		var consent = consentBox(form);
		var button = submitButton(form);

		if (!button) {
			return;
		}

		var allowed = !consent || consent.checked;

		button.disabled = !allowed;
		button.setAttribute('aria-disabled', String(!allowed));

		if (allowed) {
			button.removeAttribute('title');
		} else {
			button.title = 'Отметьте согласие на обработку персональных данных';
		}
	}

	function stamp(form) {
		var started = inputOf(form, STARTED_FIELD);

		if (started) {
			started.value = String(Date.now());
		}
	}

	function validate(form) {
		var ok = true;

		form.querySelectorAll('.guten-form-input').forEach(function (field) {
			var input = field.querySelector('input:not([hidden]), textarea');
			var required = field.querySelector('.required-badge') !== null;

			if (!input || !required) {
				return;
			}

			if (isValid(input)) {
				field.classList.remove('input-invalid');
			} else {
				field.classList.add('input-invalid');
				ok = false;
			}
		});

		return ok;
	}

	function notify(form, message, state) {
		var slot = form.querySelector('.guten-submit-wrapper .form-notification');

		if (!slot) {
			return;
		}

		slot.innerHTML = '<div class="notification-body ' + state + '">' + message + '</div>';
	}

	function reset(form) {
		form.reset();
		form.querySelectorAll('.input-invalid').forEach(function (field) {
			field.classList.remove('input-invalid');
		});
		stamp(form);
		syncSubmitState(form);
	}

	function payload(form) {
		var started = Number(valueOf(form, STARTED_FIELD)) || 0;

		return {
			name: valueOf(form, NAME_FIELD),
			email: valueOf(form, EMAIL_FIELD),
			phone: valueOf(form, PHONE_FIELD),
			message: valueOf(form, MESSAGE_FIELD),
			consent: true,
			page: window.location.href,
			elapsed_ms: started ? Date.now() - started : null
		};
	}

	function delayed(value) {
		return new Promise(function (resolve) {
			window.setTimeout(function () {
				resolve(value);
			}, FEEDBACK_DELAY);
		});
	}

	function send(form) {
		var url = endpoint();

		if (!url || typeof window.fetch !== 'function') {
			return delayed(true);
		}

		var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
		var timer = controller ? window.setTimeout(function () {
			controller.abort();
		}, FEEDBACK_TIMEOUT) : 0;

		return window.fetch(url, {
			method: 'POST',
			mode: 'cors',
			cache: 'no-store',
			credentials: 'omit',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload(form)),
			signal: controller ? controller.signal : undefined
		}).then(function (response) {
			return response.ok;
		}).catch(function () {
			return false;
		}).then(function (ok) {
			if (timer) {
				window.clearTimeout(timer);
			}

			return ok;
		});
	}

	function init(form) {
		form.removeAttribute('style');
		stamp(form);
		syncSubmitState(form);

		form.addEventListener('submit', function (event) {
			event.preventDefault();

			var consent = consentBox(form);

			if (consent && !consent.checked) {
				fieldOf(consent).classList.add('input-invalid');
				return;
			}

			if (!validate(form)) {
				return;
			}

			var button = submitButton(form);
			var trap = inputOf(form, TRAP_FIELD);

			if (button) {
				button.disabled = true;
			}

			var result = trap && trap.value.trim() !== '' ? delayed(true) : send(form);

			result.then(function (ok) {
				if (ok) {
					notify(form, SUCCESS_NOTICE, 'guten-success');
					reset(form);
					return;
				}

				notify(form, ERROR_NOTICE, 'guten-error');
				syncSubmitState(form);
			});
		});

		form.addEventListener('input', function (event) {
			var field = fieldOf(event.target);

			if (field && field.classList.contains('input-invalid') && isValid(event.target)) {
				field.classList.remove('input-invalid');
			}
		});

		form.addEventListener('change', function (event) {
			if (event.target.type !== 'checkbox') {
				return;
			}

			var field = fieldOf(event.target);

			if (field && event.target.checked) {
				field.classList.remove('input-invalid');
			}

			syncSubmitState(form);
		});
	}

	document.querySelectorAll('form.guten-form-builder').forEach(init);
})();
