document.addEventListener("DOMContentLoaded", () => {
    const yearSpan = document.getElementById("year");
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  
    const form = document.getElementById("registrationForm");
    const statusEl = document.getElementById("formStatus");
    const submitBtn = document.getElementById("submitBtn");
  
    const requiredFields = [
      "parentName",
      "parentEmail",
      "parentPhone",
      "studentName",
      "yearGroup",
      "preferredContact",
      "consent"
    ];
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors();
      statusEl.textContent = "";
      statusEl.className = "form-status";
  
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      data.consent = formData.get("consent") === "on";
  
      const isValid = runValidation(data);
      if (!isValid) return;
  
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
  
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });
  
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
  
        const result = await res.json();
        if (result.success) {
          statusEl.textContent = "Thank you. Your registration has been received. We will contact you to schedule the test.";
          statusEl.classList.add("success");
          form.reset();
        } else {
          throw new Error(result.message || "Something went wrong");
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "There was a problem submitting the form. Please try again or contact us directly.";
        statusEl.classList.add("error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit registration";
      }
    });
  
    function runValidation(data) {
      let valid = true;
  
      // Basic required check
      for (const field of requiredFields) {
        if (field === "consent") {
          if (!data.consent) {
            showError("consent", "Please confirm you are happy for us to use the data for this pilot.");
            valid = false;
          }
        } else if (!data[field] || data[field].trim() === "") {
          showError(field, "This field is required.");
          valid = false;
        }
      }
  
      // Email format
      if (data.parentEmail && !isValidEmail(data.parentEmail)) {
        showError("parentEmail", "Please enter a valid email address.");
        valid = false;
      }
  
      // Very light phone check
      if (data.parentPhone && data.parentPhone.replace(/\D/g, "").length < 7) {
        showError("parentPhone", "Please enter a valid phone or WhatsApp number.");
        valid = false;
      }
  
      return valid;
    }
  
    function showError(fieldName, message) {
      const errorEl = document.querySelector(`.error-msg[data-for="${fieldName}"]`);
      if (errorEl) {
        errorEl.textContent = message;
      }
    }
  
    function clearErrors() {
      document.querySelectorAll(".error-msg").forEach((el) => {
        el.textContent = "";
      });
    }
  
    function isValidEmail(email) {
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    }
  });
  