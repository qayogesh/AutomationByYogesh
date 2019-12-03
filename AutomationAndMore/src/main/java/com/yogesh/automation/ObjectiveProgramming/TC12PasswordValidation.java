package com.yogesh.automation.ObjectiveProgramming;

public class TC12PasswordValidation {

	public static void main(String[] args) {
		TC12PasswordValidation obj = new TC12PasswordValidation();
		System.out.println("\n\n so the password is ##" + obj.isValidPassword("neiofnlwdnf4kfkf9"));
	}

	public boolean isValidPassword(String password) {
		if (password.length() < 10)
			return false;

		int letter = 0;
		int digit = 0;
		System.out.println("Password rules:\r\n" + "A password must have at least ten characters.\r\n"
				+ "A password consists of only letters and digits.\r\n"
				+ "A password must contain at least two digits.");

		for (int i = 0; i < password.length(); i++) {
			if (isLetter(password.charAt(i)))
				letter++;
			if (isDigit(password.charAt(i)))
				digit++;
		}
		return (letter >= 8 && digit == 2);
	}

	public boolean isLetter(char ch) {
		ch = Character.toUpperCase(ch);
		return (ch >= 'A' && ch <= 'Z');
	}

	public boolean isDigit(char ch) {
		ch = Character.toUpperCase(ch);
		return (ch >= '0' && ch <= '9');
	}

}
