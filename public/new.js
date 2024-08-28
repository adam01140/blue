
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Custom Form</title>
                <style>
                    .section {
                        display: none;
                    }
                    .section.active {
                        display: block;
                    }
                    .thank-you-message {
                        display: none;
                        font-size: 20px;
                        font-weight: bold;
                        text-align: center;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <form id="customForm" onsubmit="return showThankYouMessage();">
            <script>let jumpTarget = null;</script><div id="section1" class="section active"><h2>Section 1</h2><label>q1</label><br>
			<select id="answer1">
			<option value="option a">option a</option>
			<option value="option b">option b</option>
			</select><br><br>
                        <script>
                            document.getElementById('answer1').addEventListener('change', function() {
                                if (this.value === 'option a') {
                                    jumpTarget = 'end';
                                } else {
                                    jumpTarget = null; // Reset jumpTarget if no option is selected
                                }
                            });
                        </script>
                        
                <div class="navigation-buttons"><button type="button" onclick="handleNext(1)">Next</button></div></div><div id="section2" class="section"><h2>Section 2</h2><label>q2</label><br><input type="text" id="answer2"><br><br>
                <div class="navigation-buttons"><button type="button" onclick="navigateSection(1)">Back</button><button type="button" onclick="handleNext(2)">Next</button></div></div>
                </form>
                <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
                <script>
                    function handleNext(currentSection) {
                        if (jumpTarget === 'end') {
                            document.getElementById('customForm').style.display = 'none';
                            document.getElementById('thankYouMessage').style.display = 'block';
                        } else if (jumpTarget) {
                            navigateSection(jumpTarget);
                        } else {
                            navigateSection(currentSection + 1); // Ensure it always moves to the next section if no jumpTarget
                        }
                        jumpTarget = null; // Reset jumpTarget after navigating
                    }

                    function navigateSection(sectionNumber) {
                        const sections = document.querySelectorAll('.section');
                        sections.forEach(section => section.classList.remove('active'));
                        document.getElementById('section' + sectionNumber).classList.add('active');
                    }

                    function showThankYouMessage() {
                        document.getElementById('customForm').style.display = 'none';
                        document.getElementById('thankYouMessage').style.display = 'block';
                        return false; // Prevent actual form submission
                    }
                </script>
            </body>
            </html>
            