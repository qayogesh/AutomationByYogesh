package com.yogesh.automation.practicePrograms;

public class TC18_CreatingHundredThreads extends Thread {

	public static void main(String[] args) {

		for (int i = 0; i < 100; i++) {
			TC18_CreatingHundredThreads m1 = new TC18_CreatingHundredThreads();
			m1.start();
			System.out.println("Thread name =>" + m1.getName());
		}
	}

	public synchronized void run() {
		System.out.println("\n Thread is running");
	}
}